// Read-side: everything here queries Postgres (synced via lib/sync.ts), never
// Plane directly. This is what actually fixes the rate-limit / load-time
// problem — Plane is only ever hit during a sync run.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { PlaneState, PlaneWorkItem } from "./plane";
import {
  computeCycleStats,
  computeMemberRecap,
  computeModuleStats,
  pct,
  type MemberRecapRow,
  type ProgressStats,
  type RecapFilters,
} from "./recap";

// `labels` is deliberately excluded and NOT unused-by-accident: selecting it
// alongside the other array columns (assignees, moduleIds) measured at 9s+
// for 1480 rows vs ~0.9s without it (verified directly against Supabase,
// 2026-09-24) — some combination of Prisma's array decoding + pgbouncer
// transaction pooling makes that specific column pathologically slow here.
// Nothing currently reads labels from recap items; if that changes, select
// it in a separate narrow query rather than adding it back here.
const RECAP_SELECT = {
  id: true,
  projectId: true,
  name: true,
  sequenceId: true,
  priority: true,
  stateId: true,
  stateGroup: true,
  assignees: true,
  estimatePoint: true,
  estimatePointValue: true,
  point: true,
  startDate: true,
  targetDate: true,
  createdAtPlane: true,
  completedAt: true,
  cycleId: true,
  moduleIds: true,
} satisfies Prisma.WorkItemSelect;

type DbWorkItem = Prisma.WorkItemGetPayload<{ select: typeof RECAP_SELECT }>;

// Lightweight — just enough for a project dropdown, not the full aggregate.
export async function getProjectOptions() {
  return prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

// Lightweight — just enough for a member dropdown (KPI target config).
export async function getMemberOptions() {
  return prisma.member.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: "asc" } });
}

// PRD 33.9 — every POST /api/reports/generate call logs one row here (see
// that route). This just reads them back; reopening one is handled by
// /reports/history/[id], which re-runs buildReport from the stored filters
// instead of writing a new history row.
export async function getReportHistory() {
  return prisma.reportHistory.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

function toIsoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function rowToWorkItem(row: DbWorkItem): PlaneWorkItem {
  return {
    id: row.id,
    name: row.name,
    sequence_id: row.sequenceId,
    priority: row.priority as PlaneWorkItem["priority"],
    state: row.stateId,
    assignees: row.assignees,
    labels: [], // not selected — see RECAP_SELECT comment; unused by recap.ts today
    // estimatePointValue was already resolved at sync time via
    // expand=estimate_point (per-project scale, see lib/sync.ts) — fold it
    // into `point` so recap.ts's numericEstimateOf sums it unchanged. Keep
    // estimate_point non-null whenever there was a raw option id, so
    // hasUncountedEstimate can still flag the rare case where the scale's
    // value wasn't numeric (a text/category scale) and couldn't be summed.
    estimate_point: row.estimatePoint
      ? { id: row.estimatePoint, key: null, value: row.estimatePointValue != null ? String(row.estimatePointValue) : "" }
      : null,
    point: row.point ?? row.estimatePointValue ?? null,
    start_date: toIsoDate(row.startDate),
    target_date: toIsoDate(row.targetDate),
    created_at: row.createdAtPlane.toISOString(),
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    project: row.projectId,
  };
}

// stateGroup is denormalized onto every WorkItem row at sync time, so we can
// build a statesById map straight from the items themselves — no separate
// State query needed for progress/recap math (name/color aren't used by it).
function statesByIdFromItems(items: DbWorkItem[]): Map<string, PlaneState> {
  const map = new Map<string, PlaneState>();
  for (const item of items) {
    if (!map.has(item.stateId)) {
      map.set(item.stateId, { id: item.stateId, name: "", color: "", group: item.stateGroup as PlaneState["group"], sequence: 0 });
    }
  }
  return map;
}

function membershipFromItems(items: DbWorkItem[]) {
  const itemCycleId = new Map<string, string>();
  const itemModuleIds = new Map<string, Set<string>>();
  for (const item of items) {
    if (item.cycleId) itemCycleId.set(item.id, item.cycleId);
    if (item.moduleIds.length) itemModuleIds.set(item.id, new Set(item.moduleIds));
  }
  return { itemCycleId, itemModuleIds };
}

// Groups WorkItem rows by (projectId, stateGroup) with count + sum(effectivePoint)
// computed in Postgres, plus two small count-only queries for overdue and
// uncounted-estimate tasks — instead of pulling every row into Node and
// reducing in JS. Scoped by an optional projectId for the single-project case.
async function aggregateProgressByProject(projectId?: string): Promise<Map<string, ProgressStats>> {
  const now = new Date();
  const baseWhere = projectId ? { projectId } : {};

  const [byGroup, overdueRows, uncountedRows] = await Promise.all([
    prisma.workItem.groupBy({
      by: ["projectId", "stateGroup"],
      where: baseWhere,
      _count: true,
      _sum: { effectivePoint: true },
    }),
    prisma.workItem.groupBy({
      by: ["projectId"],
      where: { ...baseWhere, stateGroup: { notIn: ["completed", "cancelled"] }, targetDate: { lt: now } },
      _count: true,
    }),
    prisma.workItem.groupBy({
      by: ["projectId"],
      where: { ...baseWhere, effectivePoint: null, estimatePoint: { not: null } },
      _count: true,
    }),
  ]);

  const overdueByProject = new Map(overdueRows.map((r) => [r.projectId, r._count]));
  const uncountedByProject = new Map(uncountedRows.map((r) => [r.projectId, r._count]));

  const statsByProject = new Map<string, ProgressStats>();
  for (const row of byGroup) {
    const stats = statsByProject.get(row.projectId) ?? {
      totalTask: 0,
      completedTask: 0,
      inProgressTask: 0,
      backlogTask: 0,
      cancelledTask: 0,
      totalEstimate: 0,
      completedEstimate: 0,
      taskProgressPct: 0,
      estimateProgressPct: 0,
      overdueTask: overdueByProject.get(row.projectId) ?? 0,
      uncountedEstimateTask: uncountedByProject.get(row.projectId) ?? 0,
    };
    const count = row._count;
    const sum = row._sum.effectivePoint ?? 0;
    stats.totalTask += count;
    stats.totalEstimate += sum;
    if (row.stateGroup === "completed") {
      stats.completedTask += count;
      stats.completedEstimate += sum;
    } else if (row.stateGroup === "started") {
      stats.inProgressTask += count;
    } else if (row.stateGroup === "cancelled") {
      stats.cancelledTask += count;
    } else {
      stats.backlogTask += count;
    }
    statsByProject.set(row.projectId, stats);
  }
  for (const stats of statsByProject.values()) {
    stats.taskProgressPct = pct(stats.completedTask, stats.totalTask);
    stats.estimateProgressPct = pct(stats.completedEstimate, stats.totalEstimate);
  }
  return statsByProject;
}

const EMPTY_PROGRESS: ProgressStats = {
  totalTask: 0,
  completedTask: 0,
  inProgressTask: 0,
  backlogTask: 0,
  cancelledTask: 0,
  totalEstimate: 0,
  completedEstimate: 0,
  taskProgressPct: 0,
  estimateProgressPct: 0,
  overdueTask: 0,
  uncountedEstimateTask: 0,
};

export async function getOverviewData() {
  const [projects, cycles, statsByProject] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.cycle.findMany(),
    aggregateProgressByProject(),
  ]);

  const cyclesByProject = new Map<string, typeof cycles>();
  for (const cycle of cycles) {
    const list = cyclesByProject.get(cycle.projectId) ?? [];
    list.push(cycle);
    cyclesByProject.set(cycle.projectId, list);
  }

  const now = Date.now();
  const summaries = projects.map((project) => {
    const progress = statsByProject.get(project.id) ?? EMPTY_PROGRESS;
    const projectCycles = cyclesByProject.get(project.id) ?? [];
    const activeCycle = projectCycles.find(
      (c) => c.startDate && c.endDate && c.startDate.getTime() <= now && now <= c.endDate.getTime(),
    );
    return {
      id: project.id,
      name: project.name,
      identifier: project.identifier,
      memberCount: project.memberCount,
      activeCycleName: activeCycle?.name ?? null,
      ...progress,
    };
  });

  const totals = summaries.reduce(
    (acc, p) => ({
      totalTask: acc.totalTask + p.totalTask,
      completedTask: acc.completedTask + p.completedTask,
      totalEstimate: acc.totalEstimate + p.totalEstimate,
      completedEstimate: acc.completedEstimate + p.completedEstimate,
      overdueTask: acc.overdueTask + p.overdueTask,
    }),
    { totalTask: 0, completedTask: 0, totalEstimate: 0, completedEstimate: 0, overdueTask: 0 },
  );

  return { projects: summaries, totals };
}

export async function getProjectDetailData(projectId: string) {
  const [statsByProject, cycles, modules, projectMembers, overdueItems] = await Promise.all([
    aggregateProgressByProject(projectId),
    prisma.cycle.findMany({ where: { projectId } }),
    prisma.module.findMany({ where: { projectId } }),
    prisma.projectMember.findMany({ where: { projectId } }),
    prisma.workItem.findMany({
      where: { projectId, stateGroup: { notIn: ["completed", "cancelled"] }, targetDate: { lt: new Date() } },
      select: { id: true, name: true, targetDate: true },
    }),
  ]);
  const members = await prisma.member.findMany({ where: { id: { in: projectMembers.map((pm) => pm.memberId) } } });

  const progress = statsByProject.get(projectId) ?? EMPTY_PROGRESS;

  return {
    progress,
    cycles: computeCycleStats(
      cycles.map((c) => ({
        id: c.id,
        name: c.name,
        start_date: toIsoDate(c.startDate),
        end_date: toIsoDate(c.endDate),
        total_issues: c.totalIssues,
        completed_issues: c.completedIssues,
        cancelled_issues: c.cancelledIssues,
        started_issues: c.startedIssues,
        unstarted_issues: c.unstartedIssues,
        backlog_issues: c.backlogIssues,
      })),
    ),
    modules: computeModuleStats(
      modules.map((m) => ({ id: m.id, name: m.name, total_issues: m.totalIssues, completed_issues: m.completedIssues })),
    ),
    members: members.map((m) => ({ id: m.id, display_name: m.displayName })),
    overdueItems: overdueItems.map((i) => ({ id: i.id, name: i.name, target_date: toIsoDate(i.targetDate) })),
  };
}

export interface DbRecapFilters {
  periodStart: Date;
  periodEnd: Date;
  dateBasis?: "created" | "completed";
  projectId?: string;
  cycleId?: string;
  moduleId?: string;
  assigneeId?: string;
}

export async function getMemberRecapData(filters: DbRecapFilters): Promise<MemberRecapRow[]> {
  const items = await prisma.workItem.findMany({
    select: RECAP_SELECT,
    where: filters.projectId ? { projectId: filters.projectId } : undefined,
  });
  const projectIds = [...new Set(items.map((i) => i.projectId))];
  const memberSets = await prisma.projectMember.findMany({ where: { projectId: { in: projectIds } } });
  const members = await prisma.member.findMany({ where: { id: { in: [...new Set(memberSets.map((m) => m.memberId))] } } });
  const memberShapes = members.map((m) => ({
    id: m.id,
    first_name: m.firstName,
    last_name: m.lastName,
    email: m.email,
    display_name: m.displayName,
  }));

  const statesById = statesByIdFromItems(items);
  const { itemCycleId, itemModuleIds } = membershipFromItems(items);

  const recapFilters: RecapFilters = {
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
    dateBasis: filters.dateBasis,
    cycleId: filters.cycleId,
    moduleId: filters.moduleId,
    assigneeId: filters.assigneeId,
    itemCycleId,
    itemModuleIds,
  };

  return computeMemberRecap(items.map(rowToWorkItem), statesById, memberShapes, recapFilters);
}

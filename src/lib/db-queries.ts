// Read-side: everything here queries Postgres (synced via lib/sync.ts), never
// Plane directly. This is what actually fixes the rate-limit / load-time
// problem — Plane is only ever hit during a sync run.

import { prisma } from "./prisma";
import type { PlaneState, PlaneWorkItem } from "./plane";
import {
  computeCycleStats,
  computeMemberRecap,
  computeModuleStats,
  computeProgress,
  type MemberRecapRow,
  type RecapFilters,
} from "./recap";

type DbWorkItem = Awaited<ReturnType<typeof prisma.workItem.findMany>>[number];

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
    labels: row.labels,
    estimate_point: row.estimatePoint,
    point: row.point,
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

export async function getOverviewData() {
  const [projects, allItems, allCycles] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.workItem.findMany(),
    prisma.cycle.findMany(),
  ]);

  const itemsByProject = new Map<string, DbWorkItem[]>();
  for (const item of allItems) {
    const list = itemsByProject.get(item.projectId) ?? [];
    list.push(item);
    itemsByProject.set(item.projectId, list);
  }
  const cyclesByProject = new Map<string, typeof allCycles>();
  for (const cycle of allCycles) {
    const list = cyclesByProject.get(cycle.projectId) ?? [];
    list.push(cycle);
    cyclesByProject.set(cycle.projectId, list);
  }

  const now = Date.now();
  const summaries = projects.map((project) => {
    const items = itemsByProject.get(project.id) ?? [];
    const statesById = statesByIdFromItems(items);
    const progress = computeProgress(items.map(rowToWorkItem), statesById);
    const cycles = cyclesByProject.get(project.id) ?? [];
    const activeCycle = cycles.find(
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
  const [items, cycles, modules, projectMembers] = await Promise.all([
    prisma.workItem.findMany({ where: { projectId } }),
    prisma.cycle.findMany({ where: { projectId } }),
    prisma.module.findMany({ where: { projectId } }),
    prisma.projectMember.findMany({ where: { projectId } }),
  ]);
  const members = await prisma.member.findMany({ where: { id: { in: projectMembers.map((pm) => pm.memberId) } } });

  const statesById = statesByIdFromItems(items);
  const progress = computeProgress(items.map(rowToWorkItem), statesById);
  const now = new Date();

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
    overdueItems: items
      .filter((i) => i.stateGroup !== "completed" && i.stateGroup !== "cancelled" && i.targetDate && i.targetDate < now)
      .map((i) => ({ id: i.id, name: i.name, target_date: toIsoDate(i.targetDate) })),
  };
}

export interface DbRecapFilters {
  periodStart: Date;
  periodEnd: Date;
  projectId?: string;
  cycleId?: string;
  moduleId?: string;
  assigneeId?: string;
}

export async function getMemberRecapData(filters: DbRecapFilters): Promise<MemberRecapRow[]> {
  const items = await prisma.workItem.findMany({
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
    cycleId: filters.cycleId,
    moduleId: filters.moduleId,
    assigneeId: filters.assigneeId,
    itemCycleId,
    itemModuleIds,
  };

  return computeMemberRecap(items.map(rowToWorkItem), statesById, memberShapes, recapFilters);
}

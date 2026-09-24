import type { PlaneCycle, PlaneMember, PlaneModule, PlaneState, PlaneWorkItem } from "./plane";

export interface ProgressStats {
  totalTask: number;
  completedTask: number;
  inProgressTask: number;
  backlogTask: number;
  cancelledTask: number;
  totalEstimate: number;
  completedEstimate: number;
  taskProgressPct: number;
  estimateProgressPct: number;
  overdueTask: number;
}

function estimateOf(item: PlaneWorkItem): number {
  const raw = item.point ?? item.estimate_point;
  const n = typeof raw === "string" ? Number(raw) : raw;
  return Number.isFinite(n) ? (n as number) : 0;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal
}

export function computeProgress(items: PlaneWorkItem[], statesById: Map<string, PlaneState>): ProgressStats {
  const now = new Date();
  let completedTask = 0,
    inProgressTask = 0,
    backlogTask = 0,
    cancelledTask = 0,
    totalEstimate = 0,
    completedEstimate = 0,
    overdueTask = 0;

  for (const item of items) {
    const group = statesById.get(item.state)?.group;
    const est = estimateOf(item);
    totalEstimate += est;

    if (group === "completed") {
      completedTask++;
      completedEstimate += est;
    } else if (group === "started") {
      inProgressTask++;
    } else if (group === "cancelled") {
      cancelledTask++;
    } else {
      backlogTask++; // backlog + unstarted
    }

    if (group !== "completed" && group !== "cancelled" && item.target_date) {
      if (new Date(item.target_date) < now) overdueTask++;
    }
  }

  const totalTask = items.length;
  return {
    totalTask,
    completedTask,
    inProgressTask,
    backlogTask,
    cancelledTask,
    totalEstimate,
    completedEstimate,
    taskProgressPct: pct(completedTask, totalTask),
    estimateProgressPct: pct(completedEstimate, totalEstimate),
    overdueTask,
  };
}

export interface MemberRecapRow {
  memberId: string;
  memberName: string;
  doneTask: number;
  totalPoint: number;
  tasks: { id: string; name: string; point: number; completedAt: string | null }[];
}

export interface RecapFilters {
  periodStart: Date;
  periodEnd: Date; // inclusive
  projectId?: string;
  cycleId?: string;
  moduleId?: string;
  assigneeId?: string;
}

/**
 * Rekap point per anggota tim.
 * Aturan bisnis (PRD 15.1.2): periode diterapkan pada Created Date, status harus Done.
 */
export function computeMemberRecap(
  items: PlaneWorkItem[],
  statesById: Map<string, PlaneState>,
  members: PlaneMember[],
  filters: RecapFilters,
): MemberRecapRow[] {
  const rows = new Map<string, MemberRecapRow>();
  const memberById = new Map(members.map((m) => [m.id, m]));

  for (const item of items) {
    const createdAt = new Date(item.created_at);
    if (createdAt < filters.periodStart || createdAt > filters.periodEnd) continue;
    if (statesById.get(item.state)?.group !== "completed") continue;
    if (filters.cycleId && item.cycle !== filters.cycleId) continue;
    if (filters.moduleId && !item.module_ids?.includes(filters.moduleId)) continue;

    for (const assigneeId of item.assignees) {
      if (filters.assigneeId && assigneeId !== filters.assigneeId) continue;
      const member = memberById.get(assigneeId);
      const point = estimateOf(item);
      const existing = rows.get(assigneeId) ?? {
        memberId: assigneeId,
        memberName: member?.display_name ?? member?.email ?? "Unknown",
        doneTask: 0,
        totalPoint: 0,
        tasks: [],
      };
      existing.doneTask += 1;
      existing.totalPoint += point;
      existing.tasks.push({ id: item.id, name: item.name, point, completedAt: item.completed_at });
      rows.set(assigneeId, existing);
    }
  }

  return [...rows.values()].sort((a, b) => b.totalPoint - a.totalPoint);
}

export function computeCycleStats(cycles: PlaneCycle[]) {
  return cycles.map((c) => ({
    ...c,
    taskProgressPct: pct(c.completed_issues, c.total_issues),
  }));
}

export function computeModuleStats(modules: PlaneModule[]) {
  return modules.map((m) => ({
    ...m,
    taskProgressPct: pct(m.completed_issues, m.total_issues),
  }));
}

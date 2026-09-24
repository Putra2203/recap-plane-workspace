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
  // Items whose estimate_point option couldn't be resolved to a number (a
  // non-numeric/text estimate scale) and have no numeric `point` either.
  // Should be rare now that sync resolves estimate_point via
  // expand=estimate_point — kept as a safety net, not the common case.
  uncountedEstimateTask: number;
}

// `point` here is already the fully-resolved number by the time recap.ts
// sees it: lib/sync.ts reads estimate_point via expand=estimate_point (its
// `value` is per-project — the same option UUID means a different number in
// a different project's scale) and lib/db-queries.ts folds that resolved
// value into `point` for any item that doesn't have the legacy numeric
// `point` field set directly. See PlaneEstimatePoint in lib/plane.ts.
function numericEstimateOf(item: PlaneWorkItem): number {
  return typeof item.point === "number" ? item.point : 0;
}

function hasUncountedEstimate(item: PlaneWorkItem): boolean {
  return item.point == null && item.estimate_point != null;
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
    overdueTask = 0,
    uncountedEstimateTask = 0;

  for (const item of items) {
    const group = statesById.get(item.state)?.group;
    const est = numericEstimateOf(item);
    totalEstimate += est;
    if (hasUncountedEstimate(item)) uncountedEstimateTask++;

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
    uncountedEstimateTask,
  };
}

export interface MemberRecapRow {
  memberId: string;
  memberName: string;
  doneTask: number;
  totalPoint: number;
  uncountedEstimateTask: number;
  tasks: { id: string; name: string; point: number; hasUncountedEstimate: boolean; completedAt: string | null }[];
}

export type DateBasis = "created" | "completed";

export interface RecapFilters {
  periodStart: Date;
  periodEnd: Date; // inclusive
  // Which date field the period is matched against.
  // - "created" (default): PRD 15.1.1/15.1.6 business rule — a task counts
  //   in the period it was created, even if it's only marked Done later.
  // - "completed": counts a task in the period it was actually finished —
  //   more intuitive for "who finished what this month", and what most
  //   people assume "monthly recap" means.
  dateBasis?: DateBasis;
  projectId?: string;
  cycleId?: string;
  moduleId?: string;
  assigneeId?: string;
  // Work item ID -> cycle ID / module IDs. Required because Plane does not
  // expose this as a field on the work item — see lib/db-queries.ts.
  itemCycleId?: Map<string, string>;
  itemModuleIds?: Map<string, Set<string>>;
}

/**
 * Rekap point per anggota tim. Status harus Done; periode diterapkan pada
 * Created Date atau Completed Date sesuai filters.dateBasis (PRD 15.1.2).
 */
export function computeMemberRecap(
  items: PlaneWorkItem[],
  statesById: Map<string, PlaneState>,
  members: PlaneMember[],
  filters: RecapFilters,
): MemberRecapRow[] {
  const rows = new Map<string, MemberRecapRow>();
  const memberById = new Map(members.map((m) => [m.id, m]));
  const dateBasis = filters.dateBasis ?? "created";

  for (const item of items) {
    if (statesById.get(item.state)?.group !== "completed") continue;
    const basisDateStr = dateBasis === "completed" ? item.completed_at : item.created_at;
    if (!basisDateStr) continue;
    const basisDate = new Date(basisDateStr);
    if (basisDate < filters.periodStart || basisDate > filters.periodEnd) continue;
    if (filters.cycleId && filters.itemCycleId?.get(item.id) !== filters.cycleId) continue;
    if (filters.moduleId && !filters.itemModuleIds?.get(item.id)?.has(filters.moduleId)) continue;

    for (const assigneeId of item.assignees) {
      if (filters.assigneeId && assigneeId !== filters.assigneeId) continue;
      const member = memberById.get(assigneeId);
      const point = numericEstimateOf(item);
      const uncounted = hasUncountedEstimate(item);
      const existing = rows.get(assigneeId) ?? {
        memberId: assigneeId,
        memberName: member?.display_name ?? member?.email ?? "Unknown",
        doneTask: 0,
        totalPoint: 0,
        uncountedEstimateTask: 0,
        tasks: [],
      };
      existing.doneTask += 1;
      existing.totalPoint += point;
      if (uncounted) existing.uncountedEstimateTask += 1;
      existing.tasks.push({ id: item.id, name: item.name, point, hasUncountedEstimate: uncounted, completedAt: item.completed_at });
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

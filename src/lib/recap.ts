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
  // Tasks that only have a categorical estimate (estimate_point, a UUID
  // option reference Plane's public API cannot resolve to a number) and no
  // numeric `point`. Excluded from totalEstimate/completedEstimate — surface
  // this count in the UI so the progress % isn't silently misread as complete.
  uncountedEstimateTask: number;
}

// Only the legacy numeric `point` field can be summed. `estimate_point` is a
// reference to an estimate-system OPTION (UUID) that Plane's public REST API
// has no endpoint to resolve (verified: /estimates/, /estimate-points/ all
// 404 on a live instance, and no MCP tool exposes it either). Treating it as
// a number would silently fabricate data.
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

export interface RecapFilters {
  periodStart: Date;
  periodEnd: Date; // inclusive
  projectId?: string;
  cycleId?: string;
  moduleId?: string;
  assigneeId?: string;
  // Work item ID -> cycle ID / module IDs. Required because Plane does not
  // expose this as a field on the work item — see lib/data.ts.
  itemCycleId?: Map<string, string>;
  itemModuleIds?: Map<string, Set<string>>;
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

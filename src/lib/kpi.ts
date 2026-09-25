// KPI computation (PRD 17). The PRD is explicit that the system must never
// invent a KPI number without a configured target first ("Sistem tidak
// langsung menentukan nilai KPI tanpa konfigurasi aturan KPI") — so this
// only ever returns a row for a (period, projectId, memberId) that has a
// KpiTarget row. Actual completed point/task reuses computeSnapshotRows
// (the same completed-date-basis numbers Member Recap/Snapshot show), never
// a separate calculation path.
import { prisma } from "./prisma";
import { computeSnapshotRows, type SnapshotRow } from "./snapshot";

export interface KpiRow {
  period: string;
  projectId: string; // "" = target scoped across every project
  scopeName: string; // project name, or "Semua Project" for a "" target
  memberId: string;
  memberName: string;
  targetPoint: number | null;
  targetTask: number | null;
  weightCompletion: number;
  completedPoint: number;
  completedTask: number;
  pointAchievementPct: number | null;
  taskAchievementPct: number | null;
  // Weighted blend of pointAchievementPct/taskAchievementPct by
  // weightCompletion when both targets are set; falls back to whichever
  // single achievement % exists when only one target is set. This is a
  // default formula built only from the fields the PRD names (target
  // point, target task, "bobot completion") — not a general formula
  // engine. Swap this function out if the organization defines a
  // different one later; nothing else in the app assumes this shape.
  kpiScore: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// projectId "" here means "target applies across every project this member
// touched that period" — so its actual has to sum every one of that
// member's rows, not just one project's. A project-specific target only
// reads that one row. Both need the full unfiltered per-period breakdown,
// so this always computes it once regardless of a view-level project filter.
export async function computeKpiRows(period: string, viewProjectId?: string): Promise<KpiRow[]> {
  const targets = await prisma.kpiTarget.findMany({
    where: { period, ...(viewProjectId ? { projectId: { in: [viewProjectId, ""] } } : {}) },
    orderBy: [{ projectId: "asc" }, { memberId: "asc" }],
  });
  if (targets.length === 0) return [];

  const allActualRows = await computeSnapshotRows(period);
  const actualByProjectMember = new Map(allActualRows.map((r) => [`${r.projectId}:${r.memberId}`, r]));
  const projectNameById = new Map(allActualRows.map((r) => [r.projectId, r.projectName]));

  const members = await prisma.member.findMany({ where: { id: { in: [...new Set(targets.map((t) => t.memberId))] } } });
  const memberNameById = new Map(members.map((m) => [m.id, m.displayName]));

  return targets
    .map((target) => {
      let actual: { completedTask: number; completedEstimate: number };
      let scopeName: string;

      if (target.projectId === "") {
        scopeName = "Semua Project";
        actual = allActualRows
          .filter((r) => r.memberId === target.memberId)
          .reduce<{ completedTask: number; completedEstimate: number }>(
            (acc, r) => ({ completedTask: acc.completedTask + r.completedTask, completedEstimate: acc.completedEstimate + r.completedEstimate }),
            { completedTask: 0, completedEstimate: 0 },
          );
      } else {
        const row: SnapshotRow | undefined = actualByProjectMember.get(`${target.projectId}:${target.memberId}`);
        scopeName = projectNameById.get(target.projectId) ?? "Unknown project";
        actual = { completedTask: row?.completedTask ?? 0, completedEstimate: row?.completedEstimate ?? 0 };
      }

      const pointAchievementPct = target.targetPoint ? round1((actual.completedEstimate / target.targetPoint) * 100) : null;
      const taskAchievementPct = target.targetTask ? round1((actual.completedTask / target.targetTask) * 100) : null;

      let kpiScore: number | null = null;
      if (pointAchievementPct != null && taskAchievementPct != null) {
        const w = target.weightCompletion / 100;
        kpiScore = round1(pointAchievementPct * w + taskAchievementPct * (1 - w));
      } else {
        kpiScore = pointAchievementPct ?? taskAchievementPct;
      }

      return {
        period,
        projectId: target.projectId,
        scopeName,
        memberId: target.memberId,
        memberName: memberNameById.get(target.memberId) ?? "Unknown",
        targetPoint: target.targetPoint,
        targetTask: target.targetTask,
        weightCompletion: target.weightCompletion,
        completedPoint: actual.completedEstimate,
        completedTask: actual.completedTask,
        pointAchievementPct,
        taskAchievementPct,
        kpiScore,
      };
    })
    .sort((a, b) => (b.kpiScore ?? -1) - (a.kpiScore ?? -1));
}

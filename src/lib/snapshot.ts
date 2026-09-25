// Monthly point-recap lock (PRD 15.1.6 / 16 / 18). A snapshot freezes each
// (project, member)'s Done-task count/point for a calendar month into
// MonthlySnapshot rows with locked=true, so the number stays put even if
// someone edits a task's completed_at or estimate in Plane afterwards.
//
// Deliberately reuses getMemberRecapData/computeMemberRecap (completed-date
// basis) rather than a separate query path — a snapshot is exactly "what
// Member Recap says for this month, frozen". This app has no notion of
// "assigned but not Done" anywhere else (Overview/Project Detail track
// counts by stateGroup, not per-member), so totalAssignedTask mirrors
// completedTask rather than inventing a new metric this codebase doesn't
// otherwise compute.
import { prisma } from "./prisma";
import { getMemberRecapData } from "./db-queries";

export interface SnapshotRow {
  projectId: string;
  projectName: string;
  memberId: string;
  memberName: string;
  totalAssignedTask: number;
  completedTask: number;
  totalEstimate: number;
  completedEstimate: number;
}

const PERIOD_RE = /^\d{4}-\d{2}$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

export function periodRange(period: string): { periodStart: Date; periodEnd: Date } {
  const [year, month] = period.split("-").map(Number);
  return {
    periodStart: new Date(year, month - 1, 1, 0, 0, 0, 0),
    periodEnd: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

// Reshapes Member Recap's per-member rows (which can span every project a
// member touched) into one row per (project, member) — MonthlySnapshot's
// unique key is per-project, so a "Semua Project" scope splits by
// task.projectId rather than storing one workspace-wide row per member.
export async function computeSnapshotRows(period: string, projectId?: string): Promise<SnapshotRow[]> {
  const { periodStart, periodEnd } = periodRange(period);
  const memberRows = await getMemberRecapData({ periodStart, periodEnd, dateBasis: "completed", projectId });

  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const grouped = new Map<string, SnapshotRow>();
  for (const member of memberRows) {
    for (const task of member.tasks) {
      const key = `${task.projectId}:${member.memberId}`;
      const row = grouped.get(key) ?? {
        projectId: task.projectId,
        projectName: projectNameById.get(task.projectId) ?? "Unknown project",
        memberId: member.memberId,
        memberName: member.memberName,
        totalAssignedTask: 0,
        completedTask: 0,
        totalEstimate: 0,
        completedEstimate: 0,
      };
      row.completedTask += 1;
      row.totalAssignedTask += 1;
      row.completedEstimate += task.point;
      row.totalEstimate += task.point;
      grouped.set(key, row);
    }
  }

  return [...grouped.values()].sort(
    (a, b) => a.projectName.localeCompare(b.projectName) || b.completedEstimate - a.completedEstimate,
  );
}

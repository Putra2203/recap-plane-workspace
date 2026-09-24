import { planeClient } from "./plane";
import { getAllProjectBundles, getCycleModuleMembership, getProjectBundle } from "./data";
import { computeMemberRecap, computeProgress, type MemberRecapRow, type ProgressStats } from "./recap";

export type ReportType = "project" | "monthly_point";

export interface ReportParams {
  type: ReportType;
  projectId?: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  cycleId?: string;
  moduleId?: string;
  assigneeId?: string;
}

export interface ProjectReport {
  type: "project";
  projectName: string;
  period: { start: string; end: string };
  progress: ProgressStats;
  generatedAt: string;
}

export interface MonthlyPointReport {
  type: "monthly_point";
  scopeName: string; // project name or "Semua Project"
  period: { start: string; end: string };
  rows: MemberRecapRow[];
  generatedAt: string;
}

export type Report = ProjectReport | MonthlyPointReport;

export async function buildReport(params: ReportParams): Promise<Report> {
  const periodStart = new Date(params.periodStart + "T00:00:00");
  const periodEnd = new Date(params.periodEnd + "T23:59:59.999");
  const generatedAt = new Date().toISOString();

  if (params.type === "project") {
    if (!params.projectId) throw new Error("projectId wajib diisi untuk laporan project");
    const [projects, bundle] = await Promise.all([planeClient.listProjects(), getProjectBundle(params.projectId)]);
    const project = projects.find((p) => p.id === params.projectId);
    const progress = computeProgress(bundle.items, bundle.statesById);
    return {
      type: "project",
      projectName: project?.name ?? params.projectId,
      period: { start: params.periodStart, end: params.periodEnd },
      progress,
      generatedAt,
    };
  }

  // monthly_point
  const projectIds = params.projectId ? [params.projectId] : (await planeClient.listProjects()).map((p) => p.id);
  const bundles = params.projectId
    ? [{ projectId: params.projectId, ...(await getProjectBundle(params.projectId)) }]
    : await getAllProjectBundles(projectIds);

  const merged = new Map<string, MemberRecapRow>();
  for (const bundle of bundles) {
    const membership =
      params.cycleId || params.moduleId
        ? await getCycleModuleMembership(bundle.projectId, bundle.cycles, bundle.modules)
        : undefined;
    const rows = computeMemberRecap(bundle.items, bundle.statesById, bundle.members, {
      periodStart,
      periodEnd,
      cycleId: params.cycleId,
      moduleId: params.moduleId,
      assigneeId: params.assigneeId,
      itemCycleId: membership?.itemCycleId,
      itemModuleIds: membership?.itemModuleIds,
    });
    for (const row of rows) {
      const existing = merged.get(row.memberId);
      if (existing) {
        existing.doneTask += row.doneTask;
        existing.totalPoint += row.totalPoint;
        existing.uncountedEstimateTask += row.uncountedEstimateTask;
        existing.tasks.push(...row.tasks);
      } else {
        merged.set(row.memberId, { ...row, tasks: [...row.tasks] });
      }
    }
  }

  let scopeName = "Semua Project";
  if (params.projectId) {
    const projects = await planeClient.listProjects();
    scopeName = projects.find((p) => p.id === params.projectId)?.name ?? params.projectId;
  }

  return {
    type: "monthly_point",
    scopeName,
    period: { start: params.periodStart, end: params.periodEnd },
    rows: [...merged.values()].sort((a, b) => b.totalPoint - a.totalPoint),
    generatedAt,
  };
}

export function reportToText(report: Report): string {
  const lines: string[] = [];
  if (report.type === "project") {
    lines.push("LAPORAN PROGRESS PROJECT");
    lines.push(`Project: ${report.projectName}`);
    lines.push(`Periode: ${report.period.start} s/d ${report.period.end}`);
    lines.push("");
    lines.push(`Progress Project (Task): ${report.progress.taskProgressPct}%`);
    lines.push(`Progress Project (Estimate): ${report.progress.estimateProgressPct}%`);
    lines.push(`Total Task: ${report.progress.totalTask}`);
    lines.push(`Done: ${report.progress.completedTask}`);
    lines.push(`In Progress: ${report.progress.inProgressTask}`);
    lines.push(`Backlog: ${report.progress.backlogTask}`);
    lines.push(`Total Estimate: ${report.progress.totalEstimate}`);
    lines.push(`Completed Estimate: ${report.progress.completedEstimate}`);
    lines.push(`Overdue Task: ${report.progress.overdueTask}`);
    if (report.progress.uncountedEstimateTask > 0) {
      lines.push("");
      lines.push(
        `Catatan: ${report.progress.uncountedEstimateTask} task punya estimate kategori (bukan angka) yang tidak bisa dikonversi lewat Plane API, sehingga tidak masuk hitungan Total/Completed Estimate di atas.`,
      );
    }
  } else {
    lines.push("REKAP POINT ANGGOTA TIM");
    lines.push(`Scope: ${report.scopeName}`);
    lines.push(`Periode (Created Date): ${report.period.start} s/d ${report.period.end}`);
    lines.push("");
    for (const row of report.rows) {
      const note = row.uncountedEstimateTask > 0 ? ` (${row.uncountedEstimateTask} task pakai estimate kategori, tidak terhitung)` : "";
      lines.push(`${row.memberName} - ${row.totalPoint} point - ${row.doneTask} task Done${note}`);
    }
    if (report.rows.length === 0) lines.push("(Tidak ada task Done pada periode ini)");
  }
  lines.push("");
  lines.push(`Dibuat: ${new Date(report.generatedAt).toLocaleString("id-ID")}`);
  return lines.join("\n");
}

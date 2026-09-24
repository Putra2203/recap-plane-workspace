import { prisma } from "./prisma";
import { getMemberRecapData, getProjectDetailData } from "./db-queries";
import type { MemberRecapRow, ProgressStats } from "./recap";

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
    const [project, detail] = await Promise.all([
      prisma.project.findUnique({ where: { id: params.projectId } }),
      getProjectDetailData(params.projectId),
    ]);
    return {
      type: "project",
      projectName: project?.name ?? params.projectId,
      period: { start: params.periodStart, end: params.periodEnd },
      progress: detail.progress,
      generatedAt,
    };
  }

  // monthly_point
  const rows = await getMemberRecapData({
    periodStart,
    periodEnd,
    projectId: params.projectId,
    cycleId: params.cycleId,
    moduleId: params.moduleId,
    assigneeId: params.assigneeId,
  });

  let scopeName = "Semua Project";
  if (params.projectId) {
    const project = await prisma.project.findUnique({ where: { id: params.projectId } });
    scopeName = project?.name ?? params.projectId;
  }

  return {
    type: "monthly_point",
    scopeName,
    period: { start: params.periodStart, end: params.periodEnd },
    rows,
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

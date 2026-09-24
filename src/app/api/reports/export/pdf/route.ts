import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { buildReport, type Report, type ReportType } from "@/lib/report";

export const runtime = "nodejs";

function renderPdf(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (report.type === "project") {
      doc.fontSize(18).text("Laporan Progress Project", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Project: ${report.projectName}`);
      doc.text(`Periode: ${report.period.start} s/d ${report.period.end}`);
      doc.moveDown();
      doc.fontSize(14).text("Ringkasan");
      doc.fontSize(11);
      doc.text(`Task Progress: ${report.progress.taskProgressPct}%`);
      doc.text(`Estimate Progress: ${report.progress.estimateProgressPct}%`);
      doc.text(`Total Task: ${report.progress.totalTask}`);
      doc.text(`Done: ${report.progress.completedTask}`);
      doc.text(`In Progress: ${report.progress.inProgressTask}`);
      doc.text(`Backlog: ${report.progress.backlogTask}`);
      doc.text(`Total Estimate: ${report.progress.totalEstimate}`);
      doc.text(`Completed Estimate: ${report.progress.completedEstimate}`);
      doc.text(`Overdue Task: ${report.progress.overdueTask}`);
    } else {
      doc.fontSize(18).text("Rekap Point Anggota Tim", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Scope: ${report.scopeName}`);
      doc.text(`Periode (Created Date): ${report.period.start} s/d ${report.period.end}`);
      doc.moveDown();
      doc.fontSize(14).text("Rekap");
      doc.moveDown(0.5);
      doc.fontSize(11);
      if (report.rows.length === 0) {
        doc.text("(Tidak ada task Done pada periode ini)");
      }
      for (const row of report.rows) {
        doc.text(`${row.memberName}  —  ${row.totalPoint} point  —  ${row.doneTask} task Done`);
      }
    }

    doc.moveDown();
    doc.fontSize(9).fillColor("gray").text(`Dibuat: ${new Date(report.generatedAt).toLocaleString("id-ID")}`);
    doc.end();
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ReportType | null;
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");
  if (!type || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "type, periodStart, periodEnd wajib diisi" }, { status: 400 });
  }

  try {
    const report = await buildReport({
      type,
      periodStart,
      periodEnd,
      projectId: searchParams.get("projectId") ?? undefined,
      cycleId: searchParams.get("cycleId") ?? undefined,
      moduleId: searchParams.get("moduleId") ?? undefined,
      assigneeId: searchParams.get("assigneeId") ?? undefined,
    });
    const pdfBuffer = await renderPdf(report);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${type}-${periodStart}-${periodEnd}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

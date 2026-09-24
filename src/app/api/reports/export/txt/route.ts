import { NextResponse } from "next/server";
import { buildReport, reportToText, type ReportType } from "@/lib/report";

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
      dateBasis: searchParams.get("dateBasis") === "completed" ? "completed" : "created",
      projectId: searchParams.get("projectId") ?? undefined,
      cycleId: searchParams.get("cycleId") ?? undefined,
      moduleId: searchParams.get("moduleId") ?? undefined,
      assigneeId: searchParams.get("assigneeId") ?? undefined,
    });
    const text = reportToText(report);
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${type}-${periodStart}-${periodEnd}.txt"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

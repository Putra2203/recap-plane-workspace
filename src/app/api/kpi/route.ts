import { NextResponse } from "next/server";
import { computeKpiRows } from "@/lib/kpi";

const PERIOD_RE = /^\d{4}-\d{2}$/;

// GET /api/kpi?period=YYYY-MM[&projectId=...] -> computed KPI rows. Empty
// when no KpiTarget rows exist for that period — see computeKpiRows's
// doc comment for why that's intentional, not a bug.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "";
  if (!PERIOD_RE.test(period)) {
    return NextResponse.json({ error: "Format period harus YYYY-MM" }, { status: 400 });
  }
  const projectId = searchParams.get("projectId") ?? undefined;
  const rows = await computeKpiRows(period, projectId);
  return NextResponse.json({ rows });
}

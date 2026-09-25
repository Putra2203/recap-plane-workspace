import { NextResponse } from "next/server";
import { computeSnapshotRows, isValidPeriod } from "@/lib/snapshot";

// Live (unlocked) computation for a period/scope — same shape as a
// MonthlySnapshot row, just not persisted. Lets the Snapshots page show
// "this is what locking now would freeze" before the user commits to it.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "";
  if (!isValidPeriod(period)) {
    return NextResponse.json({ error: "Format period harus YYYY-MM" }, { status: 400 });
  }
  const projectId = searchParams.get("projectId") ?? undefined;
  const rows = await computeSnapshotRows(period, projectId);
  return NextResponse.json({ rows });
}

import { NextResponse } from "next/server";
import { getMemberRecapData } from "@/lib/db-queries";

function parsePeriod(searchParams: URLSearchParams) {
  const startStr = searchParams.get("periodStart");
  const endStr = searchParams.get("periodEnd");
  if (!startStr || !endStr) {
    throw new Error("periodStart dan periodEnd wajib diisi (format YYYY-MM-DD)");
  }
  const periodStart = new Date(startStr + "T00:00:00");
  const periodEnd = new Date(endStr + "T23:59:59.999");
  return { periodStart, periodEnd };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const { periodStart, periodEnd } = parsePeriod(searchParams);
    const dateBasisParam = searchParams.get("dateBasis");
    const rows = await getMemberRecapData({
      periodStart,
      periodEnd,
      dateBasis: dateBasisParam === "completed" ? "completed" : "created",
      projectId: searchParams.get("projectId") ?? undefined,
      cycleId: searchParams.get("cycleId") ?? undefined,
      moduleId: searchParams.get("moduleId") ?? undefined,
      assigneeId: searchParams.get("assigneeId") ?? undefined,
    });
    return NextResponse.json({ period: { start: searchParams.get("periodStart"), end: searchParams.get("periodEnd") }, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

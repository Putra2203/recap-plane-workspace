import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeSnapshotRows, isValidPeriod } from "@/lib/snapshot";

// GET /api/snapshots            -> distinct locked periods (for the history list)
// GET /api/snapshots?period=... -> locked rows for that period (+ optional projectId)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");

  if (!period) {
    const grouped = await prisma.monthlySnapshot.groupBy({
      by: ["period"],
      _count: { _all: true },
      _max: { snapshotDate: true },
      orderBy: { period: "desc" },
    });
    return NextResponse.json({
      periods: grouped.map((g) => ({ period: g.period, rowCount: g._count._all, lastSnapshotAt: g._max.snapshotDate })),
    });
  }

  if (!isValidPeriod(period)) {
    return NextResponse.json({ error: "Format period harus YYYY-MM" }, { status: 400 });
  }
  const projectId = searchParams.get("projectId") ?? undefined;
  const rows = await prisma.monthlySnapshot.findMany({
    where: { period, ...(projectId ? { projectId } : {}) },
    orderBy: [{ projectName: "asc" }, { completedEstimate: "desc" }],
  });
  return NextResponse.json({ rows });
}

// POST { period: "YYYY-MM", projectId?: string } -> locks that month (all
// projects if projectId is omitted). Refuses to touch a project that's
// already locked for that period instead of silently overwriting it — once
// locked=true the whole point is that the numbers don't move again.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const period = typeof body?.period === "string" ? body.period : "";
  const projectId = typeof body?.projectId === "string" && body.projectId ? body.projectId : undefined;

  if (!isValidPeriod(period)) {
    return NextResponse.json({ error: "Format period harus YYYY-MM" }, { status: 400 });
  }

  const rows = await computeSnapshotRows(period, projectId);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Tidak ada task Done pada periode ini untuk scope yang dipilih" }, { status: 400 });
  }

  const touchedProjectIds = [...new Set(rows.map((r) => r.projectId))];
  const alreadyLocked = await prisma.monthlySnapshot.findMany({
    where: { period, projectId: { in: touchedProjectIds }, locked: true },
    select: { projectName: true },
    distinct: ["projectId"],
  });
  if (alreadyLocked.length > 0) {
    return NextResponse.json(
      { error: `Sudah terkunci untuk periode ini: ${alreadyLocked.map((p) => p.projectName).join(", ")}` },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.monthlySnapshot.upsert({
        where: {
          period_projectId_memberId_cycleId: { period, projectId: row.projectId, memberId: row.memberId, cycleId: "" },
        },
        create: { period, cycleId: "", locked: true, ...row },
        update: { locked: true, snapshotDate: new Date(), ...row },
      }),
    ),
  );

  return NextResponse.json({ period, projectIds: touchedProjectIds, rowCount: rows.length });
}

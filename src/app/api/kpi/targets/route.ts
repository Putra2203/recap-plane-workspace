import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PERIOD_RE = /^\d{4}-\d{2}$/;

// GET /api/kpi/targets?period=YYYY-MM -> configured targets for that period
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "";
  if (!PERIOD_RE.test(period)) {
    return NextResponse.json({ error: "Format period harus YYYY-MM" }, { status: 400 });
  }
  const targets = await prisma.kpiTarget.findMany({ where: { period }, orderBy: [{ projectId: "asc" }, { memberId: "asc" }] });
  const memberIds = [...new Set(targets.map((t) => t.memberId))];
  const projectIds = [...new Set(targets.map((t) => t.projectId).filter(Boolean))];
  const [members, projects] = await Promise.all([
    prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, displayName: true } }),
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }),
  ]);
  const memberNameById = new Map(members.map((m) => [m.id, m.displayName]));
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  return NextResponse.json({
    targets: targets.map((t) => ({
      ...t,
      memberName: memberNameById.get(t.memberId) ?? "Unknown",
      projectName: t.projectId ? (projectNameById.get(t.projectId) ?? "Unknown project") : "Semua Project",
    })),
  });
}

// POST { period, memberId, projectId?, targetPoint?, targetTask?, weightCompletion? }
// Upserts one KPI target (unique on period+projectId+memberId).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const period = typeof body?.period === "string" ? body.period : "";
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const targetPoint = body?.targetPoint === "" || body?.targetPoint == null ? null : Number(body.targetPoint);
  const targetTask = body?.targetTask === "" || body?.targetTask == null ? null : Number(body.targetTask);
  const weightCompletion = body?.weightCompletion == null || body?.weightCompletion === "" ? 100 : Number(body.weightCompletion);

  if (!PERIOD_RE.test(period)) return NextResponse.json({ error: "Format period harus YYYY-MM" }, { status: 400 });
  if (!memberId) return NextResponse.json({ error: "Anggota wajib dipilih" }, { status: 400 });
  if (targetPoint == null && targetTask == null) {
    return NextResponse.json({ error: "Isi minimal salah satu: Target Point atau Target Task" }, { status: 400 });
  }
  if ((targetPoint != null && (!Number.isFinite(targetPoint) || targetPoint <= 0)) || (targetTask != null && (!Number.isFinite(targetTask) || targetTask <= 0))) {
    return NextResponse.json({ error: "Target harus angka positif" }, { status: 400 });
  }
  if (!Number.isFinite(weightCompletion) || weightCompletion < 0 || weightCompletion > 100) {
    return NextResponse.json({ error: "Bobot completion harus 0-100" }, { status: 400 });
  }

  const target = await prisma.kpiTarget.upsert({
    where: { period_projectId_memberId: { period, projectId, memberId } },
    create: { period, projectId, memberId, targetPoint, targetTask, weightCompletion },
    update: { targetPoint, targetTask, weightCompletion },
  });
  return NextResponse.json({ target });
}

// DELETE /api/kpi/targets?id=...
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  await prisma.kpiTarget.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

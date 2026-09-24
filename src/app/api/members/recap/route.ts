import { NextResponse } from "next/server";
import { planeClient, PlaneConfigError } from "@/lib/plane";
import { getAllProjectBundles, getCycleModuleMembership, getProjectBundle } from "@/lib/data";
import { computeMemberRecap, type MemberRecapRow } from "@/lib/recap";

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
    const projectId = searchParams.get("projectId") ?? undefined;
    const cycleId = searchParams.get("cycleId") ?? undefined;
    const moduleId = searchParams.get("moduleId") ?? undefined;
    const assigneeId = searchParams.get("assigneeId") ?? undefined;

    const projectIds = projectId ? [projectId] : (await planeClient.listProjects()).map((p) => p.id);
    const bundles = projectId ? [{ projectId, ...(await getProjectBundle(projectId)) }] : await getAllProjectBundles(projectIds);

    const merged = new Map<string, MemberRecapRow>();
    for (const bundle of bundles) {
      const membership =
        cycleId || moduleId
          ? await getCycleModuleMembership(bundle.projectId, bundle.cycles, bundle.modules)
          : undefined;
      const rows = computeMemberRecap(bundle.items, bundle.statesById, bundle.members, {
        periodStart,
        periodEnd,
        cycleId,
        moduleId,
        assigneeId,
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

    const result = [...merged.values()].sort((a, b) => b.totalPoint - a.totalPoint);
    return NextResponse.json({ period: { start: searchParams.get("periodStart"), end: searchParams.get("periodEnd") }, rows: result });
  } catch (err) {
    if (err instanceof PlaneConfigError) {
      return NextResponse.json({ error: err.message, configError: true }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

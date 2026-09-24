import { NextResponse } from "next/server";
import { getProjectBundle } from "@/lib/data";
import { computeCycleStats, computeModuleStats, computeProgress } from "@/lib/recap";
import { PlaneConfigError } from "@/lib/plane";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const bundle = await getProjectBundle(id);
    const progress = computeProgress(bundle.items, bundle.statesById);
    const cycles = computeCycleStats(bundle.cycles);
    const modules = computeModuleStats(bundle.modules);

    return NextResponse.json({
      progress,
      cycles,
      modules,
      members: bundle.members,
      overdueItems: bundle.items
        .filter((item) => {
          const group = bundle.statesById.get(item.state)?.group;
          return group !== "completed" && group !== "cancelled" && item.target_date && new Date(item.target_date) < new Date();
        })
        .map((item) => ({ id: item.id, name: item.name, target_date: item.target_date })),
    });
  } catch (err) {
    if (err instanceof PlaneConfigError) {
      return NextResponse.json({ error: err.message, configError: true }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { planeClient } from "@/lib/plane";
import { getAllProjectBundles } from "@/lib/data";
import { computeProgress } from "@/lib/recap";
import { PlaneConfigError } from "@/lib/plane";

export async function GET() {
  try {
    const projects = await planeClient.listProjects();
    const bundles = await getAllProjectBundles(projects.map((p) => p.id));

    const projectSummaries = projects.map((project) => {
      const bundle = bundles.find((b) => b.projectId === project.id)!;
      const progress = computeProgress(bundle.items, bundle.statesById);
      const activeCycles = bundle.cycles.filter((c) => {
        if (!c.start_date || !c.end_date) return false;
        const now = Date.now();
        return new Date(c.start_date).getTime() <= now && now <= new Date(c.end_date).getTime();
      });
      return {
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        memberCount: project.total_members,
        activeCycleName: activeCycles[0]?.name ?? null,
        ...progress,
      };
    });

    const totals = projectSummaries.reduce(
      (acc, p) => ({
        totalTask: acc.totalTask + p.totalTask,
        completedTask: acc.completedTask + p.completedTask,
        totalEstimate: acc.totalEstimate + p.totalEstimate,
        completedEstimate: acc.completedEstimate + p.completedEstimate,
        overdueTask: acc.overdueTask + p.overdueTask,
      }),
      { totalTask: 0, completedTask: 0, totalEstimate: 0, completedEstimate: 0, overdueTask: 0 },
    );

    return NextResponse.json({ projects: projectSummaries, totals });
  } catch (err) {
    if (err instanceof PlaneConfigError) {
      return NextResponse.json({ error: err.message, configError: true }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

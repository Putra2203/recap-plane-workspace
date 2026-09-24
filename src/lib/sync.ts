import { planeClient, type PlaneState, type PlaneWorkItem } from "./plane";
import { prisma } from "./prisma";

// This is the ONLY place in the app that's allowed to be slow / hit Plane's
// API directly and repeatedly. Everything else (overview, project detail,
// member recap, report builder) reads from Postgres. Triggered manually via
// POST /api/sync/run — see src/app/api/sync/run/route.ts.

// This instance is Cloudflare-fronted and has been observed to reset
// connections outright (not even a clean 429) under bursts of ~10+
// simultaneous requests. Keep this low — reliability matters more than
// sync speed here, since sync is a manual, infrequent background op.
const CONCURRENCY = 2;

async function mapWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

async function getCycleModuleMembership(
  projectId: string,
  cycles: { id: string; total_issues: number }[],
  modules: { id: string; total_issues: number }[],
) {
  const itemCycleId = new Map<string, string>();
  await mapWithConcurrency(
    cycles.filter((c) => c.total_issues > 0),
    async (cycle) => {
      const ids = await planeClient.listCycleWorkItemIds(projectId, cycle.id);
      for (const id of ids) itemCycleId.set(id, cycle.id);
    },
  );

  const itemModuleIds = new Map<string, Set<string>>();
  await mapWithConcurrency(
    modules.filter((m) => m.total_issues > 0),
    async (mod) => {
      const ids = await planeClient.listModuleWorkItemIds(projectId, mod.id);
      for (const id of ids) {
        const set = itemModuleIds.get(id) ?? new Set<string>();
        set.add(mod.id);
        itemModuleIds.set(id, set);
      }
    },
  );

  return { itemCycleId, itemModuleIds };
}

function toWorkItemRow(
  item: PlaneWorkItem,
  projectId: string,
  statesById: Map<string, PlaneState>,
  itemCycleId: Map<string, string>,
  itemModuleIds: Map<string, Set<string>>,
) {
  const parsedEstimateValue = item.estimate_point?.value ? Number(item.estimate_point.value) : NaN;
  const estimatePointValue = Number.isFinite(parsedEstimateValue) ? parsedEstimateValue : null;
  const point = item.point ?? null;

  return {
    id: item.id,
    projectId,
    name: item.name,
    sequenceId: item.sequence_id,
    priority: item.priority,
    stateId: item.state,
    stateGroup: statesById.get(item.state)?.group ?? "backlog",
    assignees: item.assignees,
    labels: item.labels,
    estimatePoint: item.estimate_point?.id ?? null,
    estimatePointValue,
    point,
    effectivePoint: point ?? estimatePointValue,
    startDate: item.start_date ? new Date(item.start_date) : null,
    targetDate: item.target_date ? new Date(item.target_date) : null,
    createdAtPlane: new Date(item.created_at),
    completedAt: item.completed_at ? new Date(item.completed_at) : null,
    cycleId: itemCycleId.get(item.id) ?? null,
    moduleIds: [...(itemModuleIds.get(item.id) ?? [])],
  };
}

async function syncProject(projectId: string, projectMeta: Awaited<ReturnType<typeof planeClient.listProjects>>[number]) {
  // Two small batches instead of 6 fully-concurrent requests per project.
  const [items, states, cycles] = await Promise.all([
    planeClient.listWorkItems(projectId),
    planeClient.listStates(projectId),
    planeClient.listCycles(projectId),
  ]);
  const [modules, members, labels] = await Promise.all([
    planeClient.listModules(projectId),
    planeClient.listMembers(projectId),
    planeClient.listLabels(projectId),
  ]);
  const statesById = new Map(states.map((s) => [s.id, s]));
  const { itemCycleId, itemModuleIds } = await getCycleModuleMembership(projectId, cycles, modules);

  const workItemRows = items.map((item) => toWorkItemRow(item, projectId, statesById, itemCycleId, itemModuleIds));

  await prisma.$transaction([
    prisma.state.deleteMany({ where: { projectId } }),
    prisma.label.deleteMany({ where: { projectId } }),
    prisma.cycle.deleteMany({ where: { projectId } }),
    prisma.module.deleteMany({ where: { projectId } }),
    prisma.workItem.deleteMany({ where: { projectId } }),
    prisma.projectMember.deleteMany({ where: { projectId } }),
    // Explicit field picks, not `{...s, projectId}` — Plane's API returns extra
    // fields (created_at, is_triage, workspace, ...) that aren't in our schema
    // and createMany rejects unknown keys.
    ...(states.length
      ? [
          prisma.state.createMany({
            data: states.map((s) => ({ id: s.id, projectId, name: s.name, color: s.color, group: s.group, sequence: s.sequence })),
          }),
        ]
      : []),
    ...(labels.length
      ? [prisma.label.createMany({ data: labels.map((l) => ({ id: l.id, projectId, name: l.name, color: l.color })) })]
      : []),
    ...(cycles.length
      ? [
          prisma.cycle.createMany({
            data: cycles.map((c) => ({
              id: c.id,
              projectId,
              name: c.name,
              startDate: c.start_date ? new Date(c.start_date) : null,
              endDate: c.end_date ? new Date(c.end_date) : null,
              totalIssues: c.total_issues,
              completedIssues: c.completed_issues,
              cancelledIssues: c.cancelled_issues,
              startedIssues: c.started_issues,
              unstartedIssues: c.unstarted_issues,
              backlogIssues: c.backlog_issues,
            })),
          }),
        ]
      : []),
    ...(modules.length
      ? [
          prisma.module.createMany({
            data: modules.map((m) => ({
              id: m.id,
              projectId,
              name: m.name,
              totalIssues: m.total_issues,
              completedIssues: m.completed_issues,
            })),
          }),
        ]
      : []),
    ...(workItemRows.length ? [prisma.workItem.createMany({ data: workItemRows })] : []),
    ...(members.length
      ? [prisma.projectMember.createMany({ data: members.map((m) => ({ projectId, memberId: m.id, role: m.role ?? null })) })]
      : []),
    prisma.project.upsert({
      where: { id: projectId },
      create: {
        id: projectId,
        name: projectMeta.name,
        identifier: projectMeta.identifier,
        memberCount: projectMeta.total_members,
        totalCycles: projectMeta.total_cycles,
        totalModules: projectMeta.total_modules,
      },
      update: {
        name: projectMeta.name,
        identifier: projectMeta.identifier,
        memberCount: projectMeta.total_members,
        totalCycles: projectMeta.total_cycles,
        totalModules: projectMeta.total_modules,
        syncedAt: new Date(),
      },
    }),
  ]);

  for (const m of members) {
    await prisma.member.upsert({
      where: { id: m.id },
      create: { id: m.id, firstName: m.first_name, lastName: m.last_name, email: m.email, displayName: m.display_name },
      update: { firstName: m.first_name, lastName: m.last_name, email: m.email, displayName: m.display_name, syncedAt: new Date() },
    });
  }

  return { workItemCount: items.length };
}

export interface SyncResult {
  syncRunId: string;
  projectsSynced: number;
  workItemsSynced: number;
  durationMs: number;
}

export async function runFullSync(): Promise<SyncResult> {
  const startedAt = Date.now();
  const run = await prisma.syncRun.create({ data: { status: "running" } });

  try {
    const projects = await planeClient.listProjects();
    let workItemsSynced = 0;

    await mapWithConcurrency(projects, async (project) => {
      const { workItemCount } = await syncProject(project.id, project);
      workItemsSynced += workItemCount;
    });

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        projectsSynced: projects.length,
        workItemsSynced,
      },
    });

    return { syncRunId: run.id, projectsSynced: projects.length, workItemsSynced, durationMs: Date.now() - startedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.syncRun.update({ where: { id: run.id }, data: { status: "failed", finishedAt: new Date(), error: message } });
    throw err;
  }
}

export async function getLatestSyncRun() {
  return prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } });
}

import { planeClient, type PlaneCycle, type PlaneModule, type PlaneState } from "./plane";
import { withCache } from "./cache";

export interface ProjectBundle {
  items: Awaited<ReturnType<typeof planeClient.listWorkItems>>;
  states: PlaneState[];
  statesById: Map<string, PlaneState>;
  cycles: Awaited<ReturnType<typeof planeClient.listCycles>>;
  modules: Awaited<ReturnType<typeof planeClient.listModules>>;
  members: Awaited<ReturnType<typeof planeClient.listMembers>>;
  labels: Awaited<ReturnType<typeof planeClient.listLabels>>;
}

// This Plane instance has been observed to rate-limit under burst load
// (Cloudflare-fronted, Retry-After: 39s seen around ~10 concurrent
// requests), so every fan-out in this file goes through this small
// concurrency cap instead of a bare Promise.all.
const CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

/**
 * Fetches everything needed to compute progress/stats for one project.
 * Deliberately does NOT resolve cycle/module membership per work item —
 * PlaneCycle/PlaneModule already carry total_issues/completed_issues
 * aggregates from Plane itself, and the per-cycle/module join calls
 * (cycle-issues/module-issues) are expensive (N+1 per cycle/module across
 * every project). Only fetch that via getCycleModuleMembership, and only
 * when a caller actually needs to filter by a specific cycle/module.
 *
 * Cached for 2 minutes — see lib/cache.ts for why.
 */
export async function getProjectBundle(projectId: string): Promise<ProjectBundle> {
  return withCache(`bundle:${projectId}`, 120_000, async () => {
    // Two small batches instead of 6 fully-concurrent requests.
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
    const statesById = new Map<string, PlaneState>(states.map((s) => [s.id, s]));
    return { items, states, statesById, cycles, modules, members, labels };
  });
}

export async function getAllProjectBundles(projectIds: string[]) {
  const bundles = await mapWithConcurrency(projectIds, (id) => getProjectBundle(id));
  return projectIds.map((id, i) => ({ projectId: id, ...bundles[i] }));
}

export interface CycleModuleMembership {
  itemCycleId: Map<string, string>;
  itemModuleIds: Map<string, Set<string>>;
}

/**
 * Resolves work-item -> cycle/module membership via the join endpoints.
 * Only call this when a cycle/module filter is actually in play — it does
 * one request per non-empty cycle and module in the project. Cached for 2
 * minutes per project.
 */
export async function getCycleModuleMembership(
  projectId: string,
  cycles: PlaneCycle[],
  modules: PlaneModule[],
): Promise<CycleModuleMembership> {
  return withCache(`membership:${projectId}`, 120_000, async () => {
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
  });
}

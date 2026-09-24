import { planeClient, type PlaneState } from "./plane";

export async function getProjectBundle(projectId: string) {
  const [items, states, cycles, modules, members] = await Promise.all([
    planeClient.listWorkItems(projectId),
    planeClient.listStates(projectId),
    planeClient.listCycles(projectId),
    planeClient.listModules(projectId),
    planeClient.listMembers(projectId),
  ]);
  const statesById = new Map<string, PlaneState>(states.map((s) => [s.id, s]));
  return { items, states, statesById, cycles, modules, members };
}

export async function getAllProjectBundles(projectIds: string[]) {
  const bundles = await Promise.all(projectIds.map((id) => getProjectBundle(id)));
  return projectIds.map((id, i) => ({ projectId: id, ...bundles[i] }));
}

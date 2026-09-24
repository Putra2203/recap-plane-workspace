// Plane REST API client (v1). Docs: https://developers.plane.so
// Auth: X-API-Key header, base URL configurable for self-hosted instances.

import { withCache } from "./cache";

const BASE_URL = process.env.PLANE_API_BASE_URL ?? "https://api.plane.so";
const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG ?? "";
const API_TOKEN = process.env.PLANE_API_TOKEN ?? "";

export class PlaneConfigError extends Error {}
export class PlaneApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

function assertConfigured() {
  if (!WORKSPACE_SLUG || !API_TOKEN) {
    throw new PlaneConfigError(
      "PLANE_API_TOKEN / PLANE_WORKSPACE_SLUG belum diset. Isi file .env terlebih dahulu.",
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 4;

async function planeGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  assertConfigured();
  const url = new URL(`${BASE_URL}/api/v1/workspaces/${WORKSPACE_SLUG}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { "X-API-Key": API_TOKEN, "Content-Type": "application/json" },
        // Analytics/report pages want fresh data; caller can wrap with Next.js cache if needed.
        cache: "no-store",
      });
    } catch (networkErr) {
      // Cloudflare in front of this instance sometimes resets the
      // connection outright under burst load instead of returning a clean
      // 429, which surfaces here as a generic fetch TypeError.
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      const message = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new PlaneApiError(`Network error after ${MAX_RETRIES} retries on ${path}: ${message}`, 0, null);
    }

    if (res.ok) return res.json() as Promise<T>;

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
      const backoffMs = Number.isFinite(retryAfterMs) ? retryAfterMs : 500 * 2 ** attempt;
      await sleep(backoffMs);
      continue;
    }

    const body = await res.text();
    throw new PlaneApiError(`Plane API error ${res.status} on ${path}`, res.status, body);
  }
  throw new PlaneApiError(`Plane API rate-limited after ${MAX_RETRIES} retries on ${path}`, 429, null);
}

interface PlanePage<T> {
  results: T[];
  next_cursor?: string | null;
  next_page_results?: boolean;
}

const MAX_PAGES = 50; // safety cap (~5000 items at per_page=100)

async function planeGetAllPages<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await planeGet<PlanePage<T>>(path, { ...params, per_page: 100, cursor });
    items.push(...(data.results ?? []));
    if (!data.next_page_results || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return items;
}

// Member endpoints (project + workspace) return a plain array, NOT the
// {results:[...]} paginated envelope used by every other list endpoint.
// Verified directly against a live instance on 2026-09-24 — do not "fix"
// this to use planeGetAllPages, it will silently return [].
async function planeGetArray<T>(path: string): Promise<T[]> {
  return planeGet<T[]>(path);
}

// ---- Types (subset of fields we actually use) ----

export interface PlaneProject {
  id: string;
  name: string;
  identifier: string;
  total_members: number;
  total_cycles: number;
  total_modules: number;
}

export interface PlaneState {
  id: string;
  name: string;
  color: string;
  group: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
  sequence: number;
}

// With ?expand=estimate_point, Plane resolves the estimate-system option
// reference into its actual value instead of returning a bare UUID. `value`
// is per-project — the same UUID means a different number in a different
// project's estimate scale, so it must always be read from this expanded
// object, never looked up in a cross-project UUID table. An item with no
// estimate assigned still comes back as an object (not null) but with
// key: null and value: "". Confirmed against a live instance 2026-09-24.
export interface PlaneEstimatePoint {
  id?: string;
  key: number | null;
  value: string;
}

export interface PlaneWorkItem {
  id: string;
  name: string;
  sequence_id: number;
  priority: "urgent" | "high" | "medium" | "low" | "none";
  state: string;
  assignees: string[];
  labels: string[];
  estimate_point: PlaneEstimatePoint | null;
  // Separate legacy numeric story-point field. This IS a plain number and
  // is summed the same way as a resolved estimate_point.value.
  point?: number | null;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  completed_at: string | null;
  project: string;
}

export interface PlaneLabel {
  id: string;
  name: string;
  color: string;
}

export interface PlaneCycle {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  total_issues: number;
  completed_issues: number;
  cancelled_issues: number;
  started_issues: number;
  unstarted_issues: number;
  backlog_issues: number;
}

export interface PlaneModule {
  id: string;
  name: string;
  total_issues: number;
  completed_issues: number;
}

export interface PlaneMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  role?: number;
}

// ---- Client functions ----

export const planeClient = {
  // Cached: called independently by several routes/reports per request.
  listProjects: () => withCache("projects", 120_000, () => planeGetAllPages<PlaneProject>("/projects/")),

  listWorkItems: (projectId: string) =>
    planeGetAllPages<PlaneWorkItem>(`/projects/${projectId}/issues/`, { expand: "estimate_point" }),

  listStates: (projectId: string) =>
    planeGetAllPages<PlaneState>(`/projects/${projectId}/states/`),

  listLabels: (projectId: string) => planeGetAllPages<PlaneLabel>(`/projects/${projectId}/labels/`),

  listCycles: (projectId: string) => planeGetAllPages<PlaneCycle>(`/projects/${projectId}/cycles/`),

  listModules: (projectId: string) =>
    planeGetAllPages<PlaneModule>(`/projects/${projectId}/modules/`),

  // Plain array response — see planeGetArray comment above.
  listMembers: (projectId: string) => planeGetArray<PlaneMember>(`/projects/${projectId}/members/`),

  listWorkspaceMembers: () => planeGetArray<PlaneMember>(`/members/`),

  // Cycle/module membership is NOT a field on the work item — it only
  // exists via these join endpoints. Confirmed against a live instance:
  // /issues/ and /cycles/{id}/cycle-issues/ return identically-shaped
  // WorkItem objects with no `cycle` or `module` key at all.
  listCycleWorkItemIds: async (projectId: string, cycleId: string): Promise<string[]> => {
    const items = await planeGetAllPages<{ id: string }>(
      `/projects/${projectId}/cycles/${cycleId}/cycle-issues/`,
    );
    return items.map((i) => i.id);
  },

  listModuleWorkItemIds: async (projectId: string, moduleId: string): Promise<string[]> => {
    const items = await planeGetAllPages<{ id: string }>(
      `/projects/${projectId}/modules/${moduleId}/module-issues/`,
    );
    return items.map((i) => i.id);
  },
};

export function isConfigured() {
  return Boolean(WORKSPACE_SLUG && API_TOKEN);
}

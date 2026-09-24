// Plane REST API client (v1). Docs: https://developers.plane.so
// Auth: X-API-Key header, base URL configurable for self-hosted instances.

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

async function planeGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  assertConfigured();
  const url = new URL(`${BASE_URL}/api/v1/workspaces/${WORKSPACE_SLUG}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": API_TOKEN, "Content-Type": "application/json" },
    // Analytics/report pages want fresh data; caller can wrap with Next.js cache if needed.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new PlaneApiError(`Plane API error ${res.status} on ${path}`, res.status, body);
  }
  return res.json() as Promise<T>;
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

export interface PlaneWorkItem {
  id: string;
  name: string;
  sequence_id: number;
  priority: "urgent" | "high" | "medium" | "low" | "none";
  state: string;
  assignees: string[];
  labels: string[];
  estimate_point: string | null;
  point?: number | null;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  completed_at: string | null;
  cycle?: string | null;
  module_ids?: string[];
  project: string;
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
}

// ---- Client functions ----

export const planeClient = {
  listProjects: () => planeGetAllPages<PlaneProject>("/projects/"),

  listWorkItems: (projectId: string) =>
    planeGetAllPages<PlaneWorkItem>(`/projects/${projectId}/issues/`),

  listStates: (projectId: string) =>
    planeGetAllPages<PlaneState>(`/projects/${projectId}/states/`),

  listCycles: (projectId: string) => planeGetAllPages<PlaneCycle>(`/projects/${projectId}/cycles/`),

  listModules: (projectId: string) =>
    planeGetAllPages<PlaneModule>(`/projects/${projectId}/modules/`),

  listMembers: (projectId: string) =>
    planeGetAllPages<PlaneMember>(`/projects/${projectId}/members/`),
};

export function isConfigured() {
  return Boolean(WORKSPACE_SLUG && API_TOKEN);
}

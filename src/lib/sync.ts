import { after } from "next/server";
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
  const itemModuleIds = new Map<string, Set<string>>();

  await Promise.all([
    mapWithConcurrency(
      cycles.filter((c) => c.total_issues > 0),
      async (cycle) => {
        const ids = await planeClient.listCycleWorkItemIds(projectId, cycle.id);
        for (const id of ids) itemCycleId.set(id, cycle.id);
      },
    ),
    mapWithConcurrency(
      modules.filter((m) => m.total_issues > 0),
      async (mod) => {
        const ids = await planeClient.listModuleWorkItemIds(projectId, mod.id);
        for (const id of ids) {
          const set = itemModuleIds.get(id) ?? new Set<string>();
          set.add(mod.id);
          itemModuleIds.set(id, set);
        }
      },
    ),
  ]);

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
  // Fetch all 6 project resources in parallel instead of two sequential batches
  const [items, states, cycles, modules, members, labels] = await Promise.all([
    planeClient.listWorkItems(projectId),
    planeClient.listStates(projectId),
    planeClient.listCycles(projectId),
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

  // Bulk upsert all members in a single database transaction instead of N sequential awaits
  const uniqueMembersMap = new Map(members.map((m) => [m.id, m]));
  const uniqueMembers = Array.from(uniqueMembersMap.values());
  if (uniqueMembers.length > 0) {
    await prisma.$transaction(
      uniqueMembers.map((m) =>
        prisma.member.upsert({
          where: { id: m.id },
          create: { id: m.id, firstName: m.first_name, lastName: m.last_name, email: m.email, displayName: m.display_name },
          update: { firstName: m.first_name, lastName: m.last_name, email: m.email, displayName: m.display_name, syncedAt: new Date() },
        })
      )
    );
  }

  return { workItemCount: items.length };
}

// Vercel's Hobby plan hard-caps a function's maxDuration at 60s, and per
// Next's own docs, after() runs for that same platform-configured duration —
// it does NOT grant extra time beyond the invocation's cap. A full sync
// (2-3+ minutes across all projects) can't fit in one invocation there, so
// it's split into chunks of CONCURRENCY projects each. Every chunk is its
// own invocation (see scheduleNextChunk) with a fresh time budget, chained
// together until pendingProjectIds is empty.
const MAX_CHUNKS_PER_RUN = 200; // defense-in-depth against a bug causing runaway invocations

async function claimChunk(runId: string): Promise<{ pendingIds: string[] } | null> {
  const run = await prisma.syncRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "running") return null;

  const pendingIds = (run.pendingProjectIds as string[] | null) ?? [];
  if (pendingIds.length === 0) return null;

  if (run.chunkCount >= MAX_CHUNKS_PER_RUN) {
    await prisma.syncRun.update({
      where: { id: runId },
      data: { status: "failed", finishedAt: new Date(), error: `Sync aborted after ${MAX_CHUNKS_PER_RUN} chunks without finishing` },
    });
    return null;
  }

  // Optimistic claim: chunkCount doubles as a version token so a duplicate or
  // retried continuation call for the same run (e.g. a re-fired self-fetch)
  // can't also claim and double-process the same batch of projects.
  const claim = await prisma.syncRun.updateMany({
    where: { id: runId, chunkCount: run.chunkCount },
    data: { chunkCount: run.chunkCount + 1 },
  });
  if (claim.count === 0) return null; // someone else claimed this chunk first

  return { pendingIds };
}

// Must be awaited by the caller (see performSyncChunk) on Vercel: an
// un-awaited fetch() fired from inside after() races the function instance
// being frozen as soon as the current after() callback's promise resolves,
// which can drop the request before it's even sent — this was confirmed in
// production as the exact reason chunk 2 never started. /api/sync/continue
// acks immediately and does its own chunk's work via its own after(), so
// awaiting here only costs one quick round trip, not the next chunk's full
// duration (which would otherwise cascade the 60s cap all the way down the
// chain, right back to the original bug).
async function scheduleNextChunk(runId: string): Promise<void> {
  if (process.env.VERCEL) {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    if (!host) {
      console.error(`[sync] run ${runId}: cannot schedule next chunk, VERCEL_URL is not set`);
      return;
    }
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.CRON_SECRET) headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
    // Separate from CRON_SECRET: if Vercel's own Deployment Protection
    // ("Vercel Authentication") is on for this project, Vercel's edge itself
    // rejects any request without a logged-in Vercel session — including
    // this self-fetch — with a 401 "Protected deployment" before it ever
    // reaches our route handler. Vercel Cron invocations are auto-exempted
    // from this, but a plain fetch() isn't. This header is Vercel's own
    // documented bypass ("Protection Bypass for Automation" in Project
    // Settings → Deployment Protection, which provisions this env var) —
    // confirmed as the actual cause in production.
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }
    try {
      const res = await fetch(`https://${host}/api/sync/continue`, {
        method: "POST",
        headers,
        body: JSON.stringify({ runId }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        // fetch() only rejects on network failure, NOT on a non-2xx response
        // (e.g. Vercel's own Deployment Protection, or a CRON_SECRET
        // mismatch, returning 401 before this ever reaches the route
        // handler) — that would otherwise be silently swallowed, leaving the
        // run stuck until the generic 3-minute stale-timeout message, which
        // hides the real cause. Surface it on the run immediately instead.
        const body = await res.text().catch(() => "");
        throw new Error(`Continuation call failed: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 500)}` : ""}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.syncRun.update({ where: { id: runId }, data: { status: "failed", finishedAt: new Date(), error: message } });
      console.error(`[sync] run ${runId}: failed to schedule next chunk:`, err);
    }
  } else {
    // Self-hosted long-lived process — no invocation boundary to cross, just keep going in-process.
    performSyncChunk(runId).catch((err) => console.error(`[sync] run ${runId} chunk threw unexpectedly:`, err));
  }
}

export async function performSyncChunk(runId: string): Promise<void> {
  const claimed = await claimChunk(runId);
  if (!claimed) return;

  try {
    // Process 1 project per chunk on Vercel to guarantee ultra-fast execution (~2-3s per invocation) well below the 60s limit
    const chunkSize = process.env.VERCEL ? 1 : CONCURRENCY;
    const batchIds = claimed.pendingIds.slice(0, chunkSize);
    const remaining = claimed.pendingIds.slice(chunkSize);

    const allProjects = await planeClient.listProjects();
    const projectsById = new Map(allProjects.map((p) => [p.id, p]));

    let workItemsThisBatch = 0;
    for (const id of batchIds) {
      if (projectsById.has(id)) {
        const { workItemCount } = await syncProject(id, projectsById.get(id)!);
        workItemsThisBatch += workItemCount;
      }
    }

    const finished = remaining.length === 0;
    await prisma.syncRun.update({
      where: { id: runId },
      data: {
        pendingProjectIds: remaining,
        projectsSynced: { increment: batchIds.length },
        workItemsSynced: { increment: workItemsThisBatch },
        ...(finished ? { status: "success", finishedAt: new Date() } : {}),
      },
    });

    if (!finished) await scheduleNextChunk(runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.syncRun.update({ where: { id: runId }, data: { status: "failed", finishedAt: new Date(), error: message } });
    // Nothing awaits performSyncChunk() from startSync()/scheduleNextChunk's
    // self-hosted branch — log instead of throwing into an unhandled
    // rejection. The failure is already recorded on the SyncRun row, which
    // is what the client actually reads.
    console.error(`[sync] run ${runId} chunk failed:`, err);
  }
}

/**
 * Kicks off a sync and returns almost immediately (just the time to check
 * for an in-progress run + create the row) instead of blocking for the
 * ~2-3 minutes a full sync takes.
 *
 * This matters beyond UX: a full sync as one long HTTP response is fragile
 * behind any reverse proxy/tunnel with its own timeout shorter than that —
 * confirmed in production (app.erdavid.my.id) as the exact cause of a
 * "JSON.parse: unexpected character" error on the client, because the proxy
 * cut the connection mid-sync and returned an HTML timeout page instead of
 * letting the request finish. Returning fast sidesteps that regardless of
 * the proxy's timeout setting.
 *
 * Uses Next's after() so the first chunk starts right after the response is
 * sent: after() is Next's own portable wrapper around waitUntil() — on
 * Vercel it keeps the function instance alive until the callback finishes
 * instead of freezing it right after the response is sent (bounded by that
 * invocation's maxDuration, see performSyncChunk); on a long-lived Node
 * process (`next start` behind a reverse proxy, this app's other deployment
 * target) it behaves the same as the bare fire-and-forget call this used to
 * be. Either way, nothing awaits it here on the request path — the client
 * polls SyncRun via GET /api/sync/status, and subsequent chunks (if any)
 * are chained by scheduleNextChunk.
 *
 * after() only works inside an active request (it throws synchronously
 * otherwise), so it can't be used unconditionally — auto-sync.ts calls this
 * from a bare setInterval, with no request in flight. Falls back to the
 * original bare fire-and-forget call there; that path only ever runs on a
 * long-lived self-hosted process anyway (auto-sync.ts skips itself entirely
 * on Vercel), where the bare pattern was always safe.
 */
const STALE_RUN_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes without a chunk completing

export async function cleanupStaleSyncRuns() {
  const cutoff = new Date(Date.now() - STALE_RUN_TIMEOUT_MS);
  await prisma.syncRun.updateMany({
    where: {
      status: "running",
      // updatedAt (not startedAt) — a healthy multi-chunk run legitimately
      // runs past 3 minutes in total; staleness means no chunk has
      // completed recently, i.e. the continuation chain actually died.
      updatedAt: { lt: cutoff },
    },
    data: {
      status: "failed",
      finishedAt: new Date(),
      error: "Sync timed out or process was terminated abruptly",
    },
  });
}

export async function startSync(): Promise<{ syncRunId: string; alreadyRunning: boolean }> {
  await cleanupStaleSyncRuns();

  const inProgress = await prisma.syncRun.findFirst({ where: { status: "running" }, orderBy: { startedAt: "desc" } });
  if (inProgress) {
    return { syncRunId: inProgress.id, alreadyRunning: true };
  }

  const projects = await planeClient.listProjects();
  const run = await prisma.syncRun.create({
    data: { status: "running", pendingProjectIds: projects.map((p) => p.id) },
  });
  const runFirstChunk = () =>
    performSyncChunk(run.id).catch((err) => console.error(`[sync] run ${run.id} threw unexpectedly:`, err));
  try {
    after(runFirstChunk);
  } catch {
    runFirstChunk();
  }
  return { syncRunId: run.id, alreadyRunning: false };
}

export async function getLatestSyncRun() {
  await cleanupStaleSyncRuns();
  return prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } });
}

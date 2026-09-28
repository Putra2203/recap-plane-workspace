import { NextResponse } from "next/server";
import { performSyncChunk } from "@/lib/sync";

// Internal continuation endpoint — the server calls this on itself
// (scheduleNextChunk in src/lib/sync.ts) to advance a multi-chunk sync, one
// batch of projects at a time, each as its own fresh serverless invocation
// with its own maxDuration budget.
export const maxDuration = 60;

// Same auth as /api/cron/sync: Vercel-originated calls carry the shared
// secret when CRON_SECRET is set. Safe even if left open, since
// performSyncChunk's optimistic claim makes a duplicate/replayed call a
// no-op rather than double-processing a batch.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await req.json();
  if (!runId || typeof runId !== "string") {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  await performSyncChunk(runId);
  return NextResponse.json({ ok: true });
}

import { after, NextResponse } from "next/server";
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

  // Ack fast and do this chunk's work via after(), same reason /api/sync/run
  // does — the caller (the previous chunk's scheduleNextChunk) awaits this
  // response before its own invocation can end. If we awaited the full chunk
  // here instead, that wait would cascade backward through every prior chunk
  // in the chain, right back to needing one invocation alive for the whole
  // sync — exactly the bug this endpoint exists to avoid.
  const runChunk = () => performSyncChunk(runId).catch((err) => console.error(`[sync] run ${runId} chunk threw unexpectedly:`, err));
  try {
    after(runChunk);
  } catch {
    runChunk();
  }
  return NextResponse.json({ ok: true });
}

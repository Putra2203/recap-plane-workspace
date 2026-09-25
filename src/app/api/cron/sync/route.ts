import { NextResponse } from "next/server";
import { startSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

// Vercel Cron Job target (see vercel.json). auto-sync.ts's setInterval is
// deliberately disabled on Vercel — a serverless function instance can be
// frozen or recycled between requests, so an interval has no guarantee of
// firing again, or of firing on only one instance if several are warm at
// once. A Cron Job hitting a route is Vercel's own primitive for "run this
// on a schedule" and doesn't have either problem.
//
// Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on its own
// cron invocations when a CRON_SECRET env var is set on the project. If it's
// not set, this endpoint is left open (anyone who finds the URL could
// trigger a sync) — startSync()'s in-progress guard caps the actual damage
// to "an extra sync run", but set CRON_SECRET in Vercel's env vars to close
// that off properly.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { syncRunId, alreadyRunning } = await startSync();
    return NextResponse.json({ syncRunId, alreadyRunning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

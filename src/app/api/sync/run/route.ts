import { NextResponse } from "next/server";
import { startSync } from "@/lib/sync";

// Returns almost immediately — the actual sync (2-3+ minutes for a large
// workspace) continues in the background. See startSync()'s doc comment:
// this specifically fixes a proxy-timeout bug (JSON.parse error on the
// client behind app.erdavid.my.id) that a long blocking response caused.
// The client polls GET /api/sync/status to know when it's done.
export async function POST() {
  try {
    const { syncRunId, alreadyRunning } = await startSync();
    return NextResponse.json({ syncRunId, alreadyRunning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

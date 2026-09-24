import { NextResponse } from "next/server";
import { runFullSync } from "@/lib/sync";
import { PlaneConfigError } from "@/lib/plane";

// Full sync against Plane can take well over a minute for a large workspace
// (16 projects, 1480+ work items observed). This route intentionally blocks
// until it's done rather than faking a background job — see the "Sync Now"
// button's loading state on the client for how that's surfaced.
// If this ever runs on a serverless host (e.g. Vercel), raise the function
// timeout to match — the default (10-60s depending on plan) will kill this.
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await runFullSync();
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof PlaneConfigError) {
      return NextResponse.json({ error: err.message, configError: true }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

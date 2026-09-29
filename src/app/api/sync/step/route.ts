import { NextResponse } from "next/server";
import { performSyncStep } from "@/lib/sync";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { runId } = await req.json();
    if (!runId || typeof runId !== "string") {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }

    const result = await performSyncStep(runId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

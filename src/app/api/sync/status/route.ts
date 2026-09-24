import { NextResponse } from "next/server";
import { getLatestSyncRun } from "@/lib/sync";

export async function GET() {
  const run = await getLatestSyncRun();
  return NextResponse.json({ run });
}

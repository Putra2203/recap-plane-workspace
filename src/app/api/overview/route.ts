import { NextResponse } from "next/server";
import { getOverviewData } from "@/lib/db-queries";

export async function GET() {
  try {
    const data = await getOverviewData();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

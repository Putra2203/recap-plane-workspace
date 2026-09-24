import { NextResponse } from "next/server";
import { buildReport, type ReportParams } from "@/lib/report";
import { prisma } from "@/lib/prisma";
import { PlaneConfigError } from "@/lib/plane";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportParams & { createdBy?: string };
    const report = await buildReport(body);

    await prisma.reportHistory.create({
      data: {
        name: body.type === "project" ? `Project Report - ${body.projectId}` : `Monthly Point Report`,
        type: body.type,
        filters: JSON.stringify(body),
        createdBy: body.createdBy ?? "unknown",
      },
    });

    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof PlaneConfigError) {
      return NextResponse.json({ error: err.message, configError: true }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

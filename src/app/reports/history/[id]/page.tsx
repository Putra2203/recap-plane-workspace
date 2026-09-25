import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildReport, type ReportParams } from "@/lib/report";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EstimateMissingBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { MemberRecapRow } from "@/lib/recap";

// force-dynamic: see the comment in src/app/page.tsx. This also has to stay
// live (not cached) on purpose — reopening a history entry recomputes the
// report from the *current* synced data using the stored filters, it does
// not replay a frozen result. (A frozen number is what the separate
// Snapshot/lock feature is for — see /snapshots.)
export const dynamic = "force-dynamic";

const monthlyPointColumns: Column<MemberRecapRow>[] = [
  { key: "member", header: "Anggota", mobile: "title", cell: (r) => r.memberName },
  { key: "doneTask", header: "Done Task", align: "right", mobile: "field", cell: (r) => r.doneTask },
  {
    key: "totalPoint",
    header: "Total Point",
    align: "right",
    mobile: "field",
    cell: (r) => (
      <span className="inline-flex items-center gap-2">
        <span className="tabular-nums">{r.totalPoint}</span>
        {r.uncountedEstimateTask > 0 && <EstimateMissingBadge count={r.uncountedEstimateTask} />}
      </span>
    ),
  },
];

export default async function ReportHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await prisma.reportHistory.findUnique({ where: { id } });
  if (!entry) notFound();

  let filters: ReportParams;
  try {
    filters = JSON.parse(entry.filters) as ReportParams;
  } catch {
    return (
      <PageShell>
        <PageHeader
          breadcrumb={
            <Link href="/reports/history" className="hover:underline">
              ← Riwayat Laporan
            </Link>
          }
          title={entry.name}
        />
        <Notice tone="danger" title="Tidak bisa dibuka ulang">
          Filter laporan ini rusak/tidak terbaca.
        </Notice>
      </PageShell>
    );
  }

  const exportParams = new URLSearchParams({
    type: filters.type,
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
    dateBasis: filters.dateBasis ?? "created",
  });
  if (filters.projectId) exportParams.set("projectId", filters.projectId);

  let report;
  try {
    report = await buildReport(filters);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuka ulang laporan ini";
    return (
      <PageShell>
        <PageHeader
          breadcrumb={
            <Link href="/reports/history" className="hover:underline">
              ← Riwayat Laporan
            </Link>
          }
          title={entry.name}
        />
        <Notice tone="danger" title="Gagal membuka ulang laporan ini">
          {message}
        </Notice>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Link href="/reports/history" className="hover:underline">
            ← Riwayat Laporan
          </Link>
        }
        title={entry.name}
        description={`Dibuat ${new Date(entry.createdAt).toLocaleString("id-ID")} oleh ${entry.createdBy} — dihitung ulang dari data terkini, bukan hasil beku.`}
      />

      <Card>
        <CardHeader
          title={report.type === "project" ? `Progress Project — ${report.projectName}` : `Rekap Point — ${report.scopeName}`}
          description={`Periode: ${report.period.start} s/d ${report.period.end}${report.type === "monthly_point" ? ` (${report.dateBasis === "completed" ? "Completed Date" : "Created Date"})` : ""}`}
          actions={
            <>
              <Button variant="secondary" size="sm" href={`/api/reports/export/txt?${exportParams.toString()}`} download leftIcon={<FileText className="size-4" />}>
                Export TXT
              </Button>
              <Button variant="secondary" size="sm" href={`/api/reports/export/pdf?${exportParams.toString()}`} download leftIcon={<Download className="size-4" />}>
                Export PDF
              </Button>
            </>
          }
        />
        <CardBody>
          {report.type === "project" ? (
            <div className="flex flex-col gap-3">
              <StatGrid>
                <StatCard label="Task Progress" value={`${report.progress.taskProgressPct}%`} />
                <StatCard label="Estimate Progress" value={`${report.progress.estimateProgressPct}%`} />
                <StatCard label="Done" value={report.progress.completedTask} />
                <StatCard label="In Progress" value={report.progress.inProgressTask} />
                <StatCard label="Backlog" value={report.progress.backlogTask} />
                <StatCard label="Overdue" value={report.progress.overdueTask} tone={report.progress.overdueTask > 0 ? "danger" : "default"} />
                <StatCard label="Total Estimate" value={report.progress.totalEstimate} />
                <StatCard label="Completed Estimate" value={report.progress.completedEstimate} />
              </StatGrid>
              {report.progress.uncountedEstimateTask > 0 && <EstimateMissingBadge count={report.progress.uncountedEstimateTask} />}
            </div>
          ) : (
            <DataTable<MemberRecapRow> columns={monthlyPointColumns} rows={report.rows} getRowKey={(r) => r.memberId} caption="Rekap point anggota tim" />
          )}
        </CardBody>
      </Card>
    </PageShell>
  );
}

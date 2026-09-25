import Link from "next/link";
import { getReportHistory } from "@/lib/db-queries";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ReportParams, ReportType } from "@/lib/report";

// force-dynamic: see the comment in src/app/page.tsx.
export const dynamic = "force-dynamic";

type HistoryRow = Awaited<ReturnType<typeof getReportHistory>>[number];

const TYPE_LABEL: Record<ReportType, string> = {
  project: "Progress Project",
  monthly_point: "Rekap Point Bulanan",
};

function typeLabel(type: string): string {
  return TYPE_LABEL[type as ReportType] ?? type;
}

function periodLabel(filtersJson: string): string {
  try {
    const filters = JSON.parse(filtersJson) as ReportParams;
    return `${filters.periodStart} s/d ${filters.periodEnd}`;
  } catch {
    return "-";
  }
}

const columns: Column<HistoryRow>[] = [
  {
    key: "name",
    header: "Nama Laporan",
    mobile: "title",
    cell: (r) => (
      <Link href={`/reports/history/${r.id}`} className="font-medium text-fg hover:underline">
        {r.name}
      </Link>
    ),
  },
  { key: "type", header: "Jenis", mobile: "badge", cell: (r) => <Badge tone="info">{typeLabel(r.type)}</Badge> },
  { key: "period", header: "Periode", mobile: "subtitle", cell: (r) => periodLabel(r.filters) },
  { key: "createdBy", header: "Dibuat Oleh", mobile: "field", cell: (r) => r.createdBy },
  {
    key: "createdAt",
    header: "Waktu",
    mobile: "field",
    nowrap: true,
    cell: (r) => new Date(r.createdAt).toLocaleString("id-ID"),
  },
];

export default async function ReportHistoryPage() {
  const history = await getReportHistory();

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Link href="/reports" className="hover:underline">
            ← Report Builder
          </Link>
        }
        title="Riwayat Laporan"
        description="Setiap laporan yang di-preview di Report Builder tercatat di sini. Klik nama laporan untuk membuka ulang dengan data terkini."
      />

      {history.length > 0 ? (
        <DataTable<HistoryRow> columns={columns} rows={history} getRowKey={(r) => r.id} caption="Riwayat laporan" />
      ) : (
        <EmptyState title="Belum ada riwayat laporan" description="Buat laporan pertama di Report Builder — setiap preview otomatis tercatat di sini." />
      )}
    </PageShell>
  );
}

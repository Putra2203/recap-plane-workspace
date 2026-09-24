import Link from "next/link";
import ConfigNotice from "@/components/ConfigNotice";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { OverdueBadge } from "@/components/ui/Badge";
import { getOverviewData } from "@/lib/db-queries";

type OverviewData = Awaited<ReturnType<typeof getOverviewData>>;
type ProjectRow = OverviewData["projects"][number];

// Server Component: data is fetched straight from Postgres during render on
// the server, so the HTML sent to the browser already has the table filled
// in — no client-side loading spinner, no fetch round-trip to our own API.
//
// force-dynamic is required: Next.js only auto-detects "this page needs
// fresh data per request" from fetch() calls, not from a Prisma query. Data
// here changes via the "Sync Now" action, not a rebuild — without this, a
// production build (`next build && next start`) would prerender this page
// ONCE at build time and serve that frozen snapshot to every visitor
// forever. Confirmed the risk was real: `next build`'s route table marked
// this page "○ Static" before this was added.
export const dynamic = "force-dynamic";

const columns: Column<ProjectRow>[] = [
  {
    key: "project",
    header: "Project",
    mobile: "title",
    cell: (p) => (
      <Link href={`/projects/${p.id}`} className="font-medium text-fg hover:underline">
        {p.name}
      </Link>
    ),
  },
  { key: "taskProgress", header: "Task Progress", align: "right", mobile: "field", cell: (p) => `${p.taskProgressPct}%` },
  { key: "estimateProgress", header: "Estimate Progress", align: "right", mobile: "field", cell: (p) => `${p.estimateProgressPct}%` },
  { key: "doneTotal", header: "Done / Total", align: "right", mobile: "field", cell: (p) => `${p.completedTask} / ${p.totalTask}` },
  {
    key: "overdue",
    header: "Overdue",
    align: "right",
    mobile: "badge",
    cell: (p) => (p.overdueTask > 0 ? <OverdueBadge count={p.overdueTask} /> : "0"),
  },
  { key: "activeCycle", header: "Cycle Aktif", mobile: "subtitle", cell: (p) => p.activeCycleName ?? "-" },
];

export default async function OverviewPage() {
  let data: OverviewData;
  try {
    data = await getOverviewData();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat data";
    return (
      <PageShell>
        <ConfigNotice message={message} />
      </PageShell>
    );
  }

  if (data.projects.length === 0) {
    return (
      <PageShell>
        {/* No real "Sync sekarang" action button here (as the spec's example copy
            suggests) — that would duplicate SyncStatus's already-existing Sync
            button in the header, and this page is a Server Component so it can't
            wire that button's client-side POST/reload logic itself. Points at
            the real control instead. */}
        <EmptyState title="Belum ada data untuk periode ini" description='Klik "Sync Now" di pojok kanan atas untuk menarik task pertama kali dari Plane.' />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Overview Workspace" description="Ringkasan seluruh project di workspace Plane kamu." />

      <StatGrid>
        <StatCard label="Total Project" value={data.projects.length} />
        <StatCard label="Total Task" value={data.totals.totalTask} />
        <StatCard label="Completed Task" value={data.totals.completedTask} />
        <StatCard label="Total Estimate" value={data.totals.totalEstimate} />
        <StatCard label="Overdue Task" value={data.totals.overdueTask} tone={data.totals.overdueTask > 0 ? "danger" : "default"} />
      </StatGrid>

      <DataTable<ProjectRow> columns={columns} rows={data.projects} getRowKey={(p) => p.id} caption="Daftar project" />
    </PageShell>
  );
}

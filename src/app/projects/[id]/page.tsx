import Link from "next/link";
import ConfigNotice from "@/components/ConfigNotice";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatCard } from "@/components/ui/StatCard";
import { Section } from "@/components/ui/Section";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { EstimateMissingBadge } from "@/components/ui/Badge";
import { getProjectDetailData } from "@/lib/db-queries";

type ProjectDetailData = Awaited<ReturnType<typeof getProjectDetailData>>;
type CycleRow = ProjectDetailData["cycles"][number];
type ModuleRow = ProjectDetailData["modules"][number];

const progressColumns = <T extends { id: string; name: string; taskProgressPct: number; completed_issues: number; total_issues: number }>(): Column<T>[] => [
  { key: "name", header: "Nama", cell: (row) => row.name, mobile: "title" },
  { key: "progress", header: "Progress", cell: (row) => `${row.taskProgressPct}%`, align: "right", mobile: "field" },
  { key: "doneTotal", header: "Done / Total", cell: (row) => `${row.completed_issues} / ${row.total_issues}`, align: "right", mobile: "field" },
];

// Server Component: fetched straight from Postgres at render time.
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: ProjectDetailData;
  try {
    data = await getProjectDetailData(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat data";
    return (
      <PageShell>
        <ConfigNotice message={message} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Detail Project"
        breadcrumb={
          <Link href="/" className="hover:text-fg">
            ← Overview
          </Link>
        }
      />

      <StatGrid>
        <StatCard label="Task Progress" value={`${data.progress.taskProgressPct}%`} hint={`${data.progress.completedTask}/${data.progress.totalTask} task`} />
        <StatCard
          label="Estimate Progress"
          value={`${data.progress.estimateProgressPct}%`}
          hint={`${data.progress.completedEstimate}/${data.progress.totalEstimate} point`}
        />
        <StatCard label="In Progress" value={data.progress.inProgressTask} />
        <StatCard label="Backlog" value={data.progress.backlogTask} />
        <StatCard label="Overdue" value={data.progress.overdueTask} tone={data.progress.overdueTask > 0 ? "danger" : "default"} />
        <StatCard label="Member" value={data.members.length} />
      </StatGrid>

      {data.progress.uncountedEstimateTask > 0 && <EstimateMissingBadge count={data.progress.uncountedEstimateTask} />}

      <Section title="Cycle">
        <DataTable<CycleRow>
          columns={progressColumns<CycleRow>()}
          rows={data.cycles}
          getRowKey={(row) => row.id}
          empty={<EmptyState title="Belum ada cycle." />}
        />
      </Section>

      <Section title="Module">
        <DataTable<ModuleRow>
          columns={progressColumns<ModuleRow>()}
          rows={data.modules}
          getRowKey={(row) => row.id}
          empty={<EmptyState title="Belum ada module." />}
        />
      </Section>

      {data.overdueItems.length > 0 && (
        <Notice tone="danger" title="Task Overdue">
          <ul className="flex flex-col gap-1">
            {data.overdueItems.map((item) => (
              <li key={item.id}>
                {item.name} <span className="text-fg-subtle">— due {item.target_date}</span>
              </li>
            ))}
          </ul>
        </Notice>
      )}
    </PageShell>
  );
}

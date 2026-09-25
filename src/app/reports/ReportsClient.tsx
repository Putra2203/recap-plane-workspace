"use client";

import { useMemo, useState } from "react";
import { Download, FileText, History } from "lucide-react";
import ConfigNotice from "@/components/ConfigNotice";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EstimateMissingBadge } from "@/components/ui/Badge";

type ReportType = "project" | "monthly_point";

interface ProjectOption {
  id: string;
  name: string;
}

interface ProjectReport {
  type: "project";
  projectName: string;
  period: { start: string; end: string };
  progress: {
    totalTask: number;
    completedTask: number;
    inProgressTask: number;
    backlogTask: number;
    totalEstimate: number;
    completedEstimate: number;
    taskProgressPct: number;
    estimateProgressPct: number;
    overdueTask: number;
    uncountedEstimateTask: number;
  };
  generatedAt: string;
}

interface MonthlyPointRow {
  memberId: string;
  memberName: string;
  doneTask: number;
  totalPoint: number;
  uncountedEstimateTask: number;
}

interface MonthlyPointReport {
  type: "monthly_point";
  scopeName: string;
  period: { start: string; end: string };
  dateBasis: "created" | "completed";
  rows: MonthlyPointRow[];
  generatedAt: string;
}

type Report = ProjectReport | MonthlyPointReport;

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

const monthlyPointColumns: Column<MonthlyPointRow>[] = [
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

export default function ReportsClient({ initialProjects }: { initialProjects: ProjectOption[] }) {
  const thisMonth = useMemo(() => monthRange(0), []);
  const [type, setType] = useState<ReportType>("monthly_point");
  const [projectId, setProjectId] = useState("");
  const [periodStart, setPeriodStart] = useState(thisMonth.start);
  const [periodEnd, setPeriodEnd] = useState(thisMonth.end);
  const [dateBasis, setDateBasis] = useState<"created" | "completed">("created");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (type === "project" && !projectId) {
      setError("Pilih project terlebih dahulu untuk laporan project.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, projectId: projectId || undefined, periodStart, periodEnd, dateBasis }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal membuat laporan");
        setReport(body.report);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const exportParams = () => {
    const params = new URLSearchParams({ type, periodStart, periodEnd, dateBasis });
    if (projectId) params.set("projectId", projectId);
    return params.toString();
  };

  return (
    <PageShell>
      <PageHeader
        title="Report Builder"
        description="Buat laporan, preview, lalu export ke PDF atau teks siap salin."
        actions={
          <Button variant="secondary" size="sm" href="/reports/history" leftIcon={<History className="size-4" />}>
            Riwayat Laporan
          </Button>
        }
      />

      <FilterBar>
        <Field label="Jenis Laporan">
          <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            <option value="monthly_point">Rekap Point Bulanan</option>
            <option value="project">Progress Project</option>
          </Select>
        </Field>
        <Field label={type === "monthly_point" ? "Project (opsional)" : "Project"}>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{type === "project" ? "Pilih project..." : "Semua Project"}</option>
            {initialProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dari">
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </Field>
        <Field label="Sampai">
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </Field>
        {type === "monthly_point" && (
          <Field label="Basis Tanggal">
            <Select value={dateBasis} onChange={(e) => setDateBasis(e.target.value as "created" | "completed")}>
              <option value="created">Created Date</option>
              <option value="completed">Completed Date</option>
            </Select>
          </Field>
        )}
        <Button variant="primary" onClick={generate} loading={loading}>
          Preview
        </Button>
      </FilterBar>

      {error && <ConfigNotice message={error} />}

      {report && (
        <Card>
          <CardHeader
            title={report.type === "project" ? `Progress Project — ${report.projectName}` : `Rekap Point — ${report.scopeName}`}
            description={`Periode: ${report.period.start} s/d ${report.period.end}${report.type === "monthly_point" ? ` (${report.dateBasis === "completed" ? "Completed Date" : "Created Date"})` : ""}`}
            actions={
              <>
                <Button variant="secondary" size="sm" href={`/api/reports/export/txt?${exportParams()}`} download leftIcon={<FileText className="size-4" />}>
                  Export TXT
                </Button>
                <Button variant="secondary" size="sm" href={`/api/reports/export/pdf?${exportParams()}`} download leftIcon={<Download className="size-4" />}>
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
              <DataTable<MonthlyPointRow> columns={monthlyPointColumns} rows={report.rows} getRowKey={(r) => r.memberId} caption="Rekap point anggota tim" />
            )}
          </CardBody>
        </Card>
      )}
    </PageShell>
  );
}

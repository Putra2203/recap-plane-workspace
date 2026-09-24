"use client";

import { useEffect, useMemo, useState } from "react";
import ConfigNotice from "@/components/ConfigNotice";

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
  };
  generatedAt: string;
}

interface MonthlyPointReport {
  type: "monthly_point";
  scopeName: string;
  period: { start: string; end: string };
  rows: { memberId: string; memberName: string; doneTask: number; totalPoint: number }[];
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

export default function ReportsPage() {
  const thisMonth = useMemo(() => monthRange(0), []);
  const [type, setType] = useState<ReportType>("monthly_point");
  const [projectId, setProjectId] = useState("");
  const [periodStart, setPeriodStart] = useState(thisMonth.start);
  const [periodEnd, setPeriodEnd] = useState(thisMonth.end);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/overview")
      .then((res) => res.json())
      .then((body) => {
        if (body.projects) setProjects(body.projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

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
      body: JSON.stringify({ type, projectId: projectId || undefined, periodStart, periodEnd }),
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
    const params = new URLSearchParams({ type, periodStart, periodEnd });
    if (projectId) params.set("projectId", projectId);
    return params.toString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Report Builder</h1>
        <p className="text-sm text-neutral-500">Buat laporan, preview, lalu export ke PDF atau teks siap salin.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="flex flex-col text-sm">
          Jenis Laporan
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className="rounded border border-neutral-300 px-2 py-1">
            <option value="monthly_point">Rekap Point Bulanan</option>
            <option value="project">Progress Project</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Project {type === "monthly_point" && <span className="text-neutral-400">(opsional)</span>}
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-neutral-300 px-2 py-1">
            <option value="">{type === "project" ? "Pilih project..." : "Semua Project"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Dari
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Sampai
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <button onClick={generate} disabled={loading} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {loading ? "Memuat..." : "Preview"}
        </button>
      </div>

      {error && <ConfigNotice message={error} />}

      {report && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {report.type === "project" ? `Progress Project — ${report.projectName}` : `Rekap Point — ${report.scopeName}`}
            </h2>
            <div className="flex gap-2">
              <a href={`/api/reports/export/txt?${exportParams()}`} className="rounded border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100">
                Export TXT
              </a>
              <a href={`/api/reports/export/pdf?${exportParams()}`} className="rounded border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100">
                Export PDF
              </a>
            </div>
          </div>
          <p className="text-sm text-neutral-500">
            Periode: {report.period.start} s/d {report.period.end}
          </p>

          {report.type === "project" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <div>Task Progress: <b>{report.progress.taskProgressPct}%</b></div>
              <div>Estimate Progress: <b>{report.progress.estimateProgressPct}%</b></div>
              <div>Done: <b>{report.progress.completedTask}</b></div>
              <div>In Progress: <b>{report.progress.inProgressTask}</b></div>
              <div>Backlog: <b>{report.progress.backlogTask}</b></div>
              <div>Overdue: <b>{report.progress.overdueTask}</b></div>
              <div>Total Estimate: <b>{report.progress.totalEstimate}</b></div>
              <div>Completed Estimate: <b>{report.progress.completedEstimate}</b></div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-1">Anggota</th>
                  <th className="py-1">Done Task</th>
                  <th className="py-1">Total Point</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.memberId} className="border-t border-neutral-100">
                    <td className="py-1">{r.memberName}</td>
                    <td className="py-1">{r.doneTask}</td>
                    <td className="py-1">{r.totalPoint}</td>
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-neutral-400">
                      Tidak ada data pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

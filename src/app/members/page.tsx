"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import ConfigNotice from "@/components/ConfigNotice";

interface MemberRow {
  memberId: string;
  memberName: string;
  doneTask: number;
  totalPoint: number;
  uncountedEstimateTask: number;
  tasks: { id: string; name: string; point: number; hasUncountedEstimate: boolean; completedAt: string | null }[];
}

interface ProjectOption {
  id: string;
  name: string;
}

interface FilterOption {
  id: string;
  name: string;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export default function MembersPage() {
  const thisMonth = useMemo(() => monthRange(0), []);
  const [periodStart, setPeriodStart] = useState(thisMonth.start);
  const [periodEnd, setPeriodEnd] = useState(thisMonth.end);
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [cycleId, setCycleId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [cycles, setCycles] = useState<FilterOption[]>([]);
  const [modules, setModules] = useState<FilterOption[]>([]);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
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

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cycle/module filters must reset synchronously when project changes
    setCycleId("");
    setModuleId("");
    if (!projectId) {
      setCycles([]);
      setModules([]);
      return () => {
        ignore = true;
      };
    }
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((body) => {
        if (ignore) return;
        setCycles((body.cycles ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        setModules((body.modules ?? []).map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag must flip synchronously when filters change
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ periodStart, periodEnd });
    if (projectId) params.set("projectId", projectId);
    if (cycleId) params.set("cycleId", cycleId);
    if (moduleId) params.set("moduleId", moduleId);
    fetch(`/api/members/recap?${params.toString()}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal memuat data");
        if (!ignore) setRows(body.rows);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [periodStart, periodEnd, projectId, cycleId, moduleId]);

  const applyPreset = (offset: number) => {
    const r = monthRange(offset);
    setPeriodStart(r.start);
    setPeriodEnd(r.end);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Rekap Point Anggota Tim</h1>
        <p className="text-sm text-neutral-500">
          Dihitung dari task berstatus <b>Done</b> berdasarkan <b>Created Date</b> pada periode yang dipilih.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex gap-2 text-sm">
          <button onClick={() => applyPreset(0)} className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100">
            Bulan ini
          </button>
          <button onClick={() => applyPreset(-1)} className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100">
            Bulan lalu
          </button>
        </div>
        <label className="flex flex-col text-sm">
          Dari
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Sampai
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Project
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-neutral-300 px-2 py-1">
            <option value="">Semua Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Cycle
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            disabled={!projectId || cycles.length === 0}
            className="rounded border border-neutral-300 px-2 py-1 disabled:bg-neutral-100 disabled:text-neutral-400"
          >
            <option value="">Semua Cycle</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Module
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            disabled={!projectId || modules.length === 0}
            className="rounded border border-neutral-300 px-2 py-1 disabled:bg-neutral-100 disabled:text-neutral-400"
          >
            <option value="">Semua Module</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <ConfigNotice message={error} />}
      {loading && <p className="text-sm text-neutral-500">Memuat...</p>}

      {!error && !loading && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Anggota</th>
                <th className="px-4 py-2">Done Task</th>
                <th className="px-4 py-2">Total Point</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.memberId}>
                  <tr className="border-t border-neutral-100">
                    <td className="px-4 py-2 font-medium">{row.memberName}</td>
                    <td className="px-4 py-2">{row.doneTask}</td>
                    <td className="px-4 py-2">
                      {row.totalPoint}
                      {row.uncountedEstimateTask > 0 && (
                        <span className="ml-2 text-xs text-amber-600" title="Task dengan estimate kategori (bukan angka) tidak ikut dijumlah — keterbatasan Plane API">
                          +{row.uncountedEstimateTask} tidak terhitung
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setExpanded(expanded === row.memberId ? null : row.memberId)}
                        className="text-xs text-neutral-500 hover:underline"
                      >
                        {expanded === row.memberId ? "Sembunyikan" : "Detail"}
                      </button>
                    </td>
                  </tr>
                  {expanded === row.memberId && (
                    <tr className="border-t border-neutral-100 bg-neutral-50">
                      <td colSpan={4} className="px-4 py-3">
                        <ul className="space-y-1 text-xs text-neutral-600">
                          {row.tasks.map((t) => (
                            <li key={t.id}>
                              {t.name} — {t.hasUncountedEstimate ? "estimate kategori (tidak terhitung)" : `${t.point} point`}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-neutral-400" colSpan={4}>
                    Tidak ada task Done pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

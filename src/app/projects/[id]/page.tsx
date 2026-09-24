"use client";

import { use, useEffect, useState } from "react";
import ConfigNotice from "@/components/ConfigNotice";
import StatCard from "@/components/StatCard";

interface ProjectDetail {
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
  cycles: { id: string; name: string; total_issues: number; completed_issues: number; taskProgressPct: number }[];
  modules: { id: string; name: string; total_issues: number; completed_issues: number; taskProgressPct: number }[];
  members: { id: string; display_name: string }[];
  overdueItems: { id: string; name: string; target_date: string }[];
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal memuat data");
        setData(body);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <ConfigNotice message={error} />;
  if (!data) return <p className="text-neutral-500">Memuat...</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Detail Project</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Task Progress" value={`${data.progress.taskProgressPct}%`} sub={`${data.progress.completedTask}/${data.progress.totalTask} task`} />
        <StatCard label="Estimate Progress" value={`${data.progress.estimateProgressPct}%`} sub={`${data.progress.completedEstimate}/${data.progress.totalEstimate} point`} />
        <StatCard label="In Progress" value={data.progress.inProgressTask} />
        <StatCard label="Backlog" value={data.progress.backlogTask} />
        <StatCard label="Overdue" value={data.progress.overdueTask} />
        <StatCard label="Member" value={data.members.length} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Cycle</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Progress</th>
                <th className="px-4 py-2">Done / Total</th>
              </tr>
            </thead>
            <tbody>
              {data.cycles.map((c) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.taskProgressPct}%</td>
                  <td className="px-4 py-2">
                    {c.completed_issues} / {c.total_issues}
                  </td>
                </tr>
              ))}
              {data.cycles.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-neutral-400" colSpan={3}>
                    Belum ada cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Module</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Progress</th>
                <th className="px-4 py-2">Done / Total</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.map((m) => (
                <tr key={m.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2">{m.taskProgressPct}%</td>
                  <td className="px-4 py-2">
                    {m.completed_issues} / {m.total_issues}
                  </td>
                </tr>
              ))}
              {data.modules.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-neutral-400" colSpan={3}>
                    Belum ada module.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {data.overdueItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-red-600">Task Overdue</h2>
          <ul className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm space-y-1">
            {data.overdueItems.map((item) => (
              <li key={item.id}>
                {item.name} <span className="text-neutral-500">— due {item.target_date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

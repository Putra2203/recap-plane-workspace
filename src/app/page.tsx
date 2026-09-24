"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfigNotice from "@/components/ConfigNotice";
import StatCard from "@/components/StatCard";

interface ProjectSummary {
  id: string;
  name: string;
  identifier: string;
  memberCount: number;
  activeCycleName: string | null;
  totalTask: number;
  completedTask: number;
  inProgressTask: number;
  backlogTask: number;
  totalEstimate: number;
  completedEstimate: number;
  taskProgressPct: number;
  estimateProgressPct: number;
  overdueTask: number;
}

interface OverviewResponse {
  projects: ProjectSummary[];
  totals: {
    totalTask: number;
    completedTask: number;
    totalEstimate: number;
    completedEstimate: number;
    overdueTask: number;
  };
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/overview")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal memuat data");
        setData(body);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-neutral-500">Memuat data dari Plane...</p>;
  if (error) return <ConfigNotice message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Overview Workspace</h1>
        <p className="text-sm text-neutral-500">Ringkasan seluruh project di workspace Plane kamu.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Project" value={data.projects.length} />
        <StatCard label="Total Task" value={data.totals.totalTask} />
        <StatCard label="Completed Task" value={data.totals.completedTask} />
        <StatCard label="Total Estimate" value={data.totals.totalEstimate} />
        <StatCard label="Overdue Task" value={data.totals.overdueTask} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Project</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Task Progress</th>
                <th className="px-4 py-2">Estimate Progress</th>
                <th className="px-4 py-2">Done / Total</th>
                <th className="px-4 py-2">Overdue</th>
                <th className="px-4 py-2">Cycle Aktif</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/projects/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.taskProgressPct}%</td>
                  <td className="px-4 py-2">{p.estimateProgressPct}%</td>
                  <td className="px-4 py-2">
                    {p.completedTask} / {p.totalTask}
                  </td>
                  <td className="px-4 py-2">
                    {p.overdueTask > 0 ? <span className="text-red-600">{p.overdueTask}</span> : 0}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{p.activeCycleName ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

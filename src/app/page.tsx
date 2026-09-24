import Link from "next/link";
import ConfigNotice from "@/components/ConfigNotice";
import StatCard from "@/components/StatCard";
import { getOverviewData } from "@/lib/db-queries";

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

export default async function OverviewPage() {
  let data: Awaited<ReturnType<typeof getOverviewData>>;
  try {
    data = await getOverviewData();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat data";
    return <ConfigNotice message={message} />;
  }

  if (data.projects.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        <p className="font-medium text-neutral-900">Belum ada data tersinkronisasi.</p>
        <p className="mt-1">Klik &quot;Sync Now&quot; di pojok kanan atas untuk menarik data dari Plane pertama kali.</p>
      </div>
    );
  }

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

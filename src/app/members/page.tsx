import { getMemberRecapData, getProjectOptions } from "@/lib/db-queries";
import MembersClient from "./MembersClient";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

// force-dynamic: see the comment in src/app/page.tsx — Prisma reads aren't
// detected by Next's static-vs-dynamic analysis the way fetch() is.
export const dynamic = "force-dynamic";

// Server Component: computes the default period and fetches the initial
// project list + recap straight from Postgres, so the page renders with
// real data on first paint. MembersClient (SWR) takes over for filter
// interactivity from there.
export default async function MembersPage() {
  const period = thisMonthRange();
  const [projects, rows] = await Promise.all([
    getProjectOptions(),
    getMemberRecapData({
      periodStart: new Date(period.start + "T00:00:00"),
      periodEnd: new Date(period.end + "T23:59:59.999"),
      dateBasis: "created",
    }),
  ]);

  return <MembersClient initialProjects={projects} initialRows={rows} initialPeriod={period} />;
}

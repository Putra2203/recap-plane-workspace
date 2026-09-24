import { getProjectOptions } from "@/lib/db-queries";
import ReportsClient from "./ReportsClient";

// force-dynamic: see the comment in src/app/page.tsx. A new project added by
// a sync should show up in this dropdown without needing a rebuild.
export const dynamic = "force-dynamic";

// Server Component: the project dropdown's options are fetched straight
// from Postgres at render time. Report generation itself stays a client
// action (POST on click), which is the right use of a plain fetch rather
// than a cached GET — nothing to prefetch until the user asks for it.
export default async function ReportsPage() {
  const projects = await getProjectOptions();
  return <ReportsClient initialProjects={projects} />;
}

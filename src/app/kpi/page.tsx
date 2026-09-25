import { getMemberOptions, getProjectOptions } from "@/lib/db-queries";
import KpiClient from "./KpiClient";

// force-dynamic: see the comment in src/app/page.tsx.
export const dynamic = "force-dynamic";

export default async function KpiPage() {
  const [projects, members] = await Promise.all([getProjectOptions(), getMemberOptions()]);
  return <KpiClient initialProjects={projects} initialMembers={members} />;
}

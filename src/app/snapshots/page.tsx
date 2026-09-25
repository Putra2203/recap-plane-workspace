import { getProjectOptions } from "@/lib/db-queries";
import SnapshotsClient from "./SnapshotsClient";

// force-dynamic: see the comment in src/app/page.tsx.
export const dynamic = "force-dynamic";

export default async function SnapshotsPage() {
  const projects = await getProjectOptions();
  return <SnapshotsClient initialProjects={projects} />;
}

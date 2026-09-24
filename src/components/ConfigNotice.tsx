import { Notice } from "@/components/ui/Notice";

export default function ConfigNotice({ message }: { message: string }) {
  return (
    <Notice tone="warning" title="Belum terhubung ke Plane">
      <p>{message}</p>
      <p className="mt-2">
        Isi <code className="rounded-control bg-warning-line/30 px-1 py-0.5">PLANE_API_TOKEN</code> dan{" "}
        <code className="rounded-control bg-warning-line/30 px-1 py-0.5">PLANE_WORKSPACE_SLUG</code> di file{" "}
        <code className="rounded-control bg-warning-line/30 px-1 py-0.5">.env</code>, lalu restart dev server.
      </p>
    </Notice>
  );
}

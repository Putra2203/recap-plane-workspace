export default function ConfigNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Belum terhubung ke Plane</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2">
        Isi <code className="rounded bg-amber-100 px-1 py-0.5">PLANE_API_TOKEN</code> dan{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5">PLANE_WORKSPACE_SLUG</code> di file{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5">.env</code>, lalu restart dev server.
      </p>
    </div>
  );
}

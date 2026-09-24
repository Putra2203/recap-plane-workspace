"use client";

import { useCallback, useEffect, useState } from "react";

interface SyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "success" | "failed";
  projectsSynced: number;
  workItemsSynced: number;
  error: string | null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export default function SyncStatus() {
  const [run, setRun] = useState<SyncRun | null | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(() => {
    fetch("/api/sync/status")
      .then((res) => res.json())
      .then((body) => setRun(body.run ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!syncing) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [syncing]);

  const runSync = () => {
    setSyncing(true);
    setError(null);
    setElapsed(0);
    fetch("/api/sync/run", { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Sync gagal");
        fetchStatus();
        // Data on the current page was fetched before the sync finished — reload so it reflects fresh data.
        window.location.reload();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSyncing(false));
  };

  return (
    <div className="flex items-center gap-3 text-xs text-neutral-500">
      {error && <span className="text-red-600">{error}</span>}
      {!error && run === undefined && <span>...</span>}
      {!error && run === null && <span>Belum pernah sync</span>}
      {!error && run && run.status === "success" && <span>Sync terakhir: {timeAgo(run.finishedAt ?? run.startedAt)}</span>}
      {!error && run && run.status === "failed" && <span className="text-red-600">Sync terakhir gagal: {run.error}</span>}
      <button
        onClick={runSync}
        disabled={syncing}
        className="rounded border border-neutral-300 px-3 py-1 font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {syncing ? `Syncing... ${elapsed}s` : "Sync Now"}
      </button>
    </div>
  );
}

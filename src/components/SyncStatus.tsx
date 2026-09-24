"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

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

  const label = syncing ? `Syncing... ${elapsed}s` : "Sync";
  const icon = <RefreshCw className={cn("size-4", syncing && "animate-spin")} />;

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Status text — desktop only; mobile keeps just the icon button (plan decision, spec is silent on this text at small widths) */}
      <span className="hidden sm:inline">
        {error && <span className="text-danger">{error}</span>}
        {!error && run === undefined && <span className="text-fg-subtle">...</span>}
        {!error && run === null && <span className="text-fg-subtle">Belum pernah sync</span>}
        {!error && run && run.status === "success" && (
          <span className="text-fg-subtle">Sync terakhir: {timeAgo(run.finishedAt ?? run.startedAt)}</span>
        )}
        {!error && run && run.status === "failed" && <span className="text-danger">Sync terakhir gagal: {run.error}</span>}
      </span>

      {/* Mobile: icon-only */}
      <Button variant="ghost" size="md" className="aspect-square px-0 sm:hidden" onClick={runSync} disabled={syncing} aria-label="Sync">
        {icon}
      </Button>
      {/* Desktop: icon + text */}
      <Button variant="ghost" size="md" className="hidden sm:inline-flex" onClick={runSync} disabled={syncing} leftIcon={icon}>
        {label}
      </Button>
    </div>
  );
}

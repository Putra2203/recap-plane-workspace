"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const reloadedRef = useRef(false);
  const executingRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/sync/status");
    const body = await res.json();
    const latest: SyncRun | null = body.run ?? null;
    setRun(latest);
    return latest;
  }, []);

  const executeSyncSteps = useCallback(async (syncRunId: string) => {
    if (executingRef.current) return;
    executingRef.current = true;
    try {
      let finished = false;
      while (!finished) {
        const res = await fetch("/api/sync/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: syncRunId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error ?? "Gagal memproses sync step");
        }
        if (data.finished || data.status !== "running") {
          finished = true;
          if (data.status === "success") {
            setSyncing(false);
            if (!reloadedRef.current) {
              reloadedRef.current = true;
              window.location.reload();
            }
          } else if (data.status === "failed") {
            setError(data.error ?? "Sync gagal");
            setSyncing(false);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync gagal";
      setError(message);
      setSyncing(false);
    } finally {
      executingRef.current = false;
    }
  }, []);

  // Initial load — also picks up a sync already running (e.g. started from
  // another tab, or this page was reloaded mid-sync) and resumes stepping for it.
  useEffect(() => {
    fetchStatus()
      .then((latest) => {
        if (latest?.status === "running") {
          setSyncing(true);
          executeSyncSteps(latest.id);
        }
      })
      .catch(() => {});
  }, [fetchStatus, executeSyncSteps]);

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
        if (!res.ok) throw new Error(body.error ?? "Gagal memulai sync");
        if (body.syncRunId) {
          executeSyncSteps(body.syncRunId);
        }
      })
      .catch((err) => {
        setError(err.message);
        setSyncing(false);
      });
  };

  const label = syncing ? `Syncing... ${elapsed}s` : "Sync";
  const icon = <RefreshCw className={cn("size-4", syncing && "animate-spin")} />;

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Status text — desktop only */}
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

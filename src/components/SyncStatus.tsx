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

const POLL_INTERVAL_MS = 3000;

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

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/sync/status");
    const body = await res.json();
    const latest: SyncRun | null = body.run ?? null;
    setRun(latest);
    return latest;
  }, []);

  // Initial load — also picks up a sync already running (e.g. started from
  // another tab, or this page was reloaded mid-sync) and resumes polling for
  // it, since a sync can now outlive any single request/page load.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial status fetch on mount (and resuming polling for an already-running sync) is intentional, not a render loop
    fetchStatus()
      .then((latest) => {
        if (latest?.status === "running") setSyncing(true);
      })
      .catch(() => {});
  }, [fetchStatus]);

  useEffect(() => {
    if (!syncing) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [syncing]);

  // Polls /api/sync/status while a sync is in progress instead of awaiting
  // one long-lived POST response. A full sync takes 2-3+ minutes for a large
  // workspace — as a single blocking request that's fragile behind any
  // reverse proxy/tunnel with a shorter timeout than that. Confirmed in
  // production (app.erdavid.my.id): the proxy cut the connection mid-sync
  // and the browser got back an HTML timeout page, which then failed
  // res.json() with "JSON.parse: unexpected character...". Every request
  // here is fast regardless of how long the sync itself takes.
  useEffect(() => {
    if (!syncing) return;
    let cancelled = false;
    const poll = () => {
      fetchStatus()
        .then((latest) => {
          if (cancelled || !latest || latest.status === "running") return;
          setSyncing(false);
          if (latest.status === "success") {
            if (!reloadedRef.current) {
              reloadedRef.current = true;
              // Data on the current page was fetched before the sync finished — reload so it reflects fresh data.
              window.location.reload();
            }
          } else {
            setError(latest.error ?? "Sync gagal");
          }
        })
        .catch(() => {
          // Transient poll failure (e.g. a proxy hiccup) — keep polling
          // rather than surfacing an error for one missed check.
        });
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [syncing, fetchStatus]);

  const runSync = () => {
    setSyncing(true);
    setError(null);
    setElapsed(0);
    fetch("/api/sync/run", { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal memulai sync");
        // Polling effect above takes over from here and flips `syncing` off
        // once the run actually finishes.
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

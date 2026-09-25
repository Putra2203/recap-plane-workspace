import { startSync } from "./sync";

// Periodic background sync, so Overview/Member Recap/Reports stay reasonably
// fresh without someone remembering to click "Sync Now". Triggered once at
// server boot from instrumentation.ts.
//
// A plain setInterval, not a cron package or platform cron job: this app is
// a single long-lived `next start` process behind a reverse proxy (see
// startSync()'s doc comment) — there's no serverless platform cron to hook
// into, and an interval is all "every N minutes, forever" needs. It calls
// the exact same startSync() Sync Now uses, so it inherits that function's
// own in-progress guard: an auto-sync tick during a still-running manual (or
// previous auto) sync is a no-op, not a pile-up.
//
// Production only (NODE_ENV === "production"): gated so `next dev` doesn't
// hit the real Plane workspace on a timer while someone is just iterating
// on the UI locally.
const DEFAULT_INTERVAL_MINUTES = 30;

function intervalMinutes(): number {
  const raw = Number(process.env.AUTO_SYNC_INTERVAL_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MINUTES;
}

let started = false;

export function startAutoSync() {
  if (started) return; // guards against instrumentation.register() firing more than once in one process
  started = true;

  if (process.env.NODE_ENV !== "production") {
    console.log("[auto-sync] disabled (NODE_ENV !== production)");
    return;
  }
  if (process.env.AUTO_SYNC_ENABLED === "false") {
    console.log("[auto-sync] disabled (AUTO_SYNC_ENABLED=false)");
    return;
  }

  const minutes = intervalMinutes();
  console.log(`[auto-sync] scheduled every ${minutes} minute(s)`);
  setInterval(
    () => {
      startSync().catch((err) => console.error("[auto-sync] failed to start a sync run:", err));
    },
    minutes * 60 * 1000,
  );
}

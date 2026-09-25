// Next's server-boot hook (stable, no config flag needed on Next 15+) — runs
// once when the server process starts. Used here purely to kick off the
// auto-sync interval (src/lib/auto-sync.ts); nothing else in this app needs
// instrumentation.
export async function register() {
  // Guard against the edge runtime: this only ever needs to run in the
  // Node.js server process (it imports Prisma), and importing that in an
  // edge context would fail to bundle.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAutoSync } = await import("./lib/auto-sync");
  startAutoSync();
}

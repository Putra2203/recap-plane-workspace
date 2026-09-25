# Plane Recap

A recap & reporting dashboard for a [Plane.so](https://plane.so) workspace — built to answer
"who did what, how much, and are we on track" without digging through Plane's own UI project by
project. Read-only by design: it mirrors your workspace into Postgres and never writes back to
Plane, so creating and editing work items, cycles, and modules stays in Plane where it belongs.

## What's in it

- **Overview** — every project's task/estimate progress, overdue count, and active cycle at a
  glance.
- **Member Recap** — point recap per person for a period, filterable by project, cycle, module,
  and label, with a per-member analytics breakdown.
- **Project Detail** — cycle/module progress and overdue tasks for one project.
- **Report Builder** — preview a progress or point-recap report, export to PDF or plain text.
- **Report History** — every report ever previewed, reopened against current data.
- **Monthly Lock** — freeze a month's point recap per project so the numbers stop moving once the
  period is closed, even if Plane data changes later.
- **KPI** — configure a target (point, task, or both, with a completion weight) per member and
  period; a score only ever appears once a target exists.
- **Sync** — a manual "Sync Now" button, plus an optional scheduled sync (self-hosted interval or
  a Vercel Cron Job) so recap data stays fresh without anyone remembering to click it.

## Design system — Canopy

The UI runs on **Canopy**, this app's own design system (`MASTER.md`): a warm, bold, saturated
leaf-green-and-cream palette with chunky rounded display type for headings and buttons, paired
with a plainer body face for dense data. Chrome — header, buttons, badges, stat cards — gets the
playful treatment; tables stay flat, bordered, and tightly spaced, because scanning fifty rows
should never get heavier than it has to be. Every color pair is WCAG contrast-checked, not
eyeballed.

| Token | | Role |
|---|---|---|
| `canvas` `#FFF8EC` | ![#FFF8EC](https://placehold.co/14/FFF8EC/FFF8EC.png) | Page background |
| `primary` `#0E6B2C` | ![#0E6B2C](https://placehold.co/14/0E6B2C/0E6B2C.png) | Brand, primary actions |
| `accent` `#FFB020` | ![#FFB020](https://placehold.co/14/FFB020/FFB020.png) | Secondary highlight |
| `danger` `#C23A28` | ![#C23A28](https://placehold.co/14/C23A28/C23A28.png) | Overdue, destructive |

Full token table, type scale, spacing/radius/shadow rail, and motion rules live in `MASTER.md`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 5 +
Supabase Postgres · SWR · Radix UI

## Architecture in one paragraph

`lib/sync.ts` is the only place in the app allowed to talk to the Plane API — it mirrors
projects, members, states, cycles, modules, and work items into Postgres. Every page and API
route reads from that mirror, never from Plane directly, so normal usage never risks Plane's rate
limits and stays fast regardless of workspace size. A sync is triggered manually (the header's
"Sync Now") or on a schedule; either way it fires in the background and the UI polls for
completion, so a slow sync never blocks or times out a request.

## Getting started

```bash
npm install          # also runs `prisma generate` via postinstall
cp .env.example .env # fill in Plane + Supabase credentials
npx prisma db push   # sync the schema to your Postgres database
npm run dev
```

Required environment variables (see `.env.example` for details):

| Variable | Purpose |
|---|---|
| `PLANE_API_TOKEN` | Plane API token (workspace Settings → API Tokens) |
| `PLANE_WORKSPACE_SLUG` | Your Plane workspace slug |
| `PLANE_API_BASE_URL` | `https://api.plane.so` (Cloud) or your self-hosted Plane URL |
| `DATABASE_URL` | Pooled Postgres connection (pgbouncer) — used at runtime |
| `DIRECT_URL` | Direct Postgres connection — used for schema pushes |
| `CRON_SECRET` | Optional, Vercel only — secures the scheduled-sync endpoint |

## Deployment

Runs either as a long-lived Node process (`next start` behind a reverse proxy — the original
target) or on Vercel. On Vercel, scheduled sync goes through a Cron Job (`vercel.json` →
`GET /api/cron/sync`) instead of an in-process interval, since a serverless instance isn't
guaranteed to stay alive long enough for one; see the comments in `src/lib/auto-sync.ts` and
`src/lib/sync.ts` for why.

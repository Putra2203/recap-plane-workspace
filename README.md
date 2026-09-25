<div align="center">

# Plane Recap

**Recap & reporting for your [Plane.so](https://plane.so) workspace.**

Who did what, how much, and are we on track — without digging through Plane project by project.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Postgres-Supabase-3ECF8E?logo=supabase&logoColor=white)
![Design system](https://img.shields.io/badge/design_system-Canopy-0E6B2C)

</div>

---

Read-only by design: it mirrors your workspace into Postgres and never writes back to Plane, so
creating and editing work items, cycles, and modules stays in Plane where it belongs. This app is
purely the recap layer on top.

## What's in it

| Page | What it does |
|---|---|
| **Overview** | Every project's task/estimate progress, overdue count, and active cycle at a glance. |
| **Member Recap** | Point recap per person for a period, filterable by project, cycle, module, and label, with a per-member analytics breakdown. |
| **Project Detail** | Cycle/module progress and overdue tasks for one project. |
| **Report Builder** | Preview a progress or point-recap report, export to PDF or plain text. |
| **Report History** | Every report ever previewed, reopened against current data. |
| **Monthly Lock** | Freeze a month's point recap per project so the numbers stop moving once the period is closed, even if Plane data changes later. |
| **KPI** | Configure a target (point, task, or both, with a completion weight) per member and period — a score only ever appears once a target exists. |
| **Sync** | A manual "Sync Now" button, plus an optional scheduled sync (self-hosted interval or a Vercel Cron Job) so recap data stays fresh without anyone remembering to click it. |

Gated behind a single shared team password (`/login`, `src/proxy.ts`) — no per-user accounts,
just enough to keep the workspace's recap and KPI data off the open internet.

## Design system — Canopy

<img align="right" width="160" alt="" src="https://placehold.co/160x120/FFF8EC/0E6B2C.png?text=Canopy&font=roboto">

The UI runs on **Canopy**, this app's own design system (see [`MASTER.md`](./MASTER.md) for the
full spec): a warm, bold, saturated leaf-green-and-cream palette with chunky rounded display type
for headings and buttons, paired with a plainer body face for dense data. Chrome — header,
buttons, badges, stat cards — gets the playful treatment; tables stay flat, bordered, and tightly
spaced, because scanning fifty rows should never get heavier than it has to be.

Every color pair below is WCAG contrast-checked, not eyeballed.

| | Token | Hex | Role |
|---|---|---|---|
| ![](https://placehold.co/40x24/FFF8EC/FFF8EC.png) | `canvas` | `#FFF8EC` | Page background |
| ![](https://placehold.co/40x24/0E6B2C/0E6B2C.png) | `primary` | `#0E6B2C` | Brand, primary actions |
| ![](https://placehold.co/40x24/FFB020/FFB020.png) | `accent` | `#FFB020` | Secondary highlight, icons |
| ![](https://placehold.co/40x24/2A6F86/2A6F86.png) | `info` | `#2A6F86` | Informational state |
| ![](https://placehold.co/40x24/8A5A00/8A5A00.png) | `warning` | `#8A5A00` | Warning state |
| ![](https://placehold.co/40x24/C23A28/C23A28.png) | `danger` | `#C23A28` | Overdue, destructive |

Full token table, type scale, spacing/radius/shadow rail, and motion rules live in `MASTER.md`.

<br clear="right">

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
| `APP_PASSWORD` | Shared team password — required, gates the whole app |
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

---

<div align="center">

Built for a single Plane.so workspace — no multi-tenant support, one shared password for the
whole team, by design.

</div>

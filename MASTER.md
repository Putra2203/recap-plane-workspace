# Canopy — Design System

Design system for **Plane Recap**, generated via `/genjutsu:paint`. Replaces the previous
token-based system ("Aubergine", `docs/design-system.md`) — same component architecture and
page structure, new visual layer, per user request ("redesign fully... rombak total UI dan
layout serta mobile responsive").

This file is the single source of truth. Every color, font, spacing, radius, and motion value
used in the app comes from here. No magic numbers in component code.

---

## Theses (validated)

**Visual:** A warm, bold consumer-app identity for an internal work tool: saturated leaf-green
primary with amber and coral accents on a soft cream canvas, chunky rounded display type for
headings and buttons paired with a clean body face for data, generous airy spacing and big
pillowy radii with a playful offset press-shadow on buttons and badges — while cards, containers
and data tables stay flat and tightly spaced so dense task lists remain scannable.

**Interaction:** Snappy 150–250ms transitions with a springy press effect on buttons and badges
(shadow compresses, element drops 2–3px on click). A gentle scale + lift on hoverable cards and
rows. A one-time staggered fade-up (40–60ms stagger) for stat cards and table rows on page load.
Nothing else moves — no scroll parallax, no idle animation, no bounce on data changes. Reduced
motion collapses everything to instant opacity-only.

**Density resolution (explicit user decision):** playful treatment applies to chrome — header,
buttons, badges, stat cards, empty states. Tables and their rows stay flat, bordered, tightly
spaced — no bold color or big radius inside a data row, so scanning dozens of rows never gets
heavier than it has to be.

---

## Color

Every text-bearing pair below is WCAG contrast-checked (computed, not eyeballed — see
`/tmp` calc during design phase). Ratios noted; all clear 4.5:1 for body text, 3:1 for
non-text UI boundaries.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `canvas` | `#FFF8EC` | Page background | — |
| `surface` | `#FFFFFF` | Cards, tables, header | — |
| `surface-muted` | `#FFF1D9` | Table headers, disabled fields | — |
| `surface-hover` | `#FFE8C7` | Row/item hover | — |
| `line` | `#EEDFC0` | Soft dividers | — |
| `line-strong` | `#A38048` | Input/control borders | 3.47:1 vs canvas |
| `fg` | `#2B2417` | Primary text | 14.55:1 vs canvas |
| `fg-muted` | `#4A3D28` | Secondary text, labels | 10.00:1 vs canvas |
| `fg-subtle` | `#6E5D3E` | Meta, captions, table headers | 6.03:1 vs canvas |
| `fg-faint` | `#B0A483` | Decorative/placeholder only — never for information | — (not for text) |
| `fg-disabled` | `#C9BC9A` | Disabled control text | — |
| `primary` | `#0E6B2C` | Brand, primary actions | — |
| `primary-hover` | `#0A5623` | Primary hover/press shadow | — |
| `primary-fg` | `#FFFFFF` | Text on primary | 6.65:1 vs primary |
| `primary-soft` | `#E3F5E7` | Active nav/tab background | — |
| `accent` | `#FFB020` | Amber — secondary highlight, icons | — |
| `accent-fg` | `#4A3400` | Text on accent | — |
| `warning` | `#8A5A00` | Warning text | 5.42:1 vs warning-bg |
| `warning-bg` | `#FFF4DB` | Warning surface | — |
| `warning-line` | `#D9A94A` | Warning border | — |
| `danger` | `#C23A28` | Danger/error text | 4.70:1 vs danger-bg |
| `danger-bg` | `#FDEDE8` | Danger surface | — |
| `danger-line` | `#CC7A62` | Danger border | 3.05:1 vs canvas |
| `danger-hover` | `#A32E1F` | Danger button hover/press shadow | — |
| `success` | `#0E6B2C` | Same as primary — completion = brand green | 5.85:1 vs success-bg |
| `success-bg` | `#E3F5E7` | Success surface | — |
| `info` | `#2A6F86` | Info text | 4.99:1 vs info-bg |
| `info-bg` | `#E7F3F6` | Info surface | — |
| `info-line` | `#5F8FA0` | Info border | 3.36:1 vs canvas |

`fg-faint` is explicitly banned from carrying real information (numbers, labels) per the
contrast audit — decorative use only.

**Dark mode:** not implemented — matches the prior Aubergine decision (`color-scheme: light`
pinned deliberately). Revisit only if asked.

---

## Typography

- **Display** (headings, buttons, nav, badges, stat values): **Fredoka**, weights 500/600/700.
  Chunky rounded terminals — carries the playful identity.
- **Body** (paragraphs, table cells, form inputs, captions): **Nunito Sans**, weights
  400/600/700. Deliberately *not* plain Nunito (which the raw dataset lookup suggested) —
  Nunito Sans has more neutral terminals than Nunito's softer rounded ones, which reads
  measurably better at 13px in dense tables. This is the one place the thesis's "clean body
  face for data" requirement overrides the raw palette-lookup suggestion.

```
https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap
```

### Scale (compact, same rhythm as before — a dense dashboard doesn't get more air just
because the brand got warmer)

| Token | Size / line-height | Use |
|---|---|---|
| `text-xs` | 12px / 16px | Captions, badges, table headers |
| `text-sm` | 13px / 20px | Body default, table cells, inputs |
| `text-base` | 15px / 22px | Paragraphs, card titles |
| `text-lg` | 17px / 26px | Section titles |
| `text-xl` | 20px / 28px | Page title, mobile |
| `text-2xl` | 26px / 32px | Page title desktop, StatCard value |

Weights: 400 (body), 600 (medium/emphasis), 700 (headings, buttons) — Fredoka doesn't ship a
400 weight, floor is 500.

---

## Spacing, radius, shadow

Same spacing scale as before (4/8/12/16/24/32/48/64px, `gap`-based layout, not margin stacking).

| Token | Value | Use |
|---|---|---|
| `radius-control` | 10px | Buttons, inputs, small controls |
| `radius-card` | 20px | Cards, containers, dialogs |
| `radius-pill` | 999px | Badges |

**Shadow — the signature detail.** Flat everywhere *except* buttons and badges, which get an
offset "press" shadow (no blur, solid color, a darker shade of the element's own fill):

```css
/* resting */
box-shadow: 0 4px 0 var(--primary-hover);
/* :active / pressed */
box-shadow: 0 1px 0 var(--primary-hover);
transform: translateY(3px);
```

Cards, tables, containers: **no shadow**, border + background contrast only — this is what
keeps dense areas calm under a bold brand.

---

## Motion tokens

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 150ms | Hover states |
| `duration-normal` | 200–250ms | Press effect, card lift |
| `ease-press` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button/badge press — the springy overshoot |
| `ease-out` | `ease-out` | Hover scale/lift |
| `stagger` | 40–60ms per item | One-time load reveal for stat cards / table rows only |

Forbidden: scroll-triggered parallax, idle/looping animation, bounce on data updates (filter
changes, sync completing). `prefers-reduced-motion` collapses all of the above to instant,
opacity-only.

---

## Base components (spec — see `src/components/ui/` for implementation)

Existing component **APIs are unchanged** from the Aubergine migration (`Button`, `Card`,
`DataTable`, `Badge`, `Dialog`, etc.) — this redesign replaces their internal class strings and
the token values those classes reference, not their props or structure. Architecture (Server/
Client boundaries, `DataTable`'s table↔card responsive logic, `Dialog`'s modal/bottom-sheet
split) stays exactly as built.

- **Button**: 5 states (default, hover, focus, active/pressed, disabled). `primary`/`danger`
  variants get the press-shadow; `secondary`/`ghost`/`link` stay flat (shadow is reserved for
  the two "committing" actions, not every button, or it stops meaning anything).
- **Badge**: full pill (`radius-pill`), small press-shadow only if interactive (most aren't).
- **Card**: `radius-card`, border + background, no shadow.
- **Input/Select**: `radius-control`, `line-strong` border, `primary` focus ring.
- **DataTable**: unchanged structurally. Desktop rows and mobile cards both stay flat/bordered
  — the one place in the app that does *not* get the bold treatment, by design.

---

## Pre-delivery checklist (from ui-ux-pro-max, kept because it's just correct hygiene)

- [ ] No emoji icons anywhere — `lucide-react` only (already the case)
- [ ] `cursor-pointer` on every clickable card/row
- [ ] Hover states are color/shadow transitions, never layout-shifting
- [ ] Focus states visible (existing `:focus-visible` ring, now in `primary` green)
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375 / 768 / 1024 / 1440px, no horizontal scroll

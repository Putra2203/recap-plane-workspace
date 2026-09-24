# Prompt: Implementasi Design System "Aubergine" (Compact + Mobile Responsive)

## Peran & tujuan

Kamu adalah senior frontend engineer yang bertugas membangun design system formal untuk aplikasi Next.js (App Router) + Tailwind CSS v4 ini, lalu memigrasikan seluruh halaman ke design system tersebut.

Hasil akhir yang diharapkan:

1. Satu sumber token (warna, tipografi, spacing, radius) di `app/globals.css` memakai pendekatan CSS-first Tailwind v4 (`@theme inline`).
2. Library komponen reusable di `components/ui/` yang menggantikan semua button, table, input, badge, notice, dan empty state yang saat ini di-copy-paste per halaman.
3. Semua halaman (Overview, Project Detail, Reports, dan halaman lain yang ada) memakai komponen tersebut. Tidak ada lagi class warna mentah seperti `neutral-*`, `amber-*`, `red-*`, `bg-white`.
4. Tampilan compact di desktop dan benar-benar rapi di mobile: tidak ada teks, label, atau angka yang menumpuk, terpotong tanpa sengaja, atau membuat halaman scroll horizontal. Setiap tabel di desktop berubah menjadi daftar card di mobile.

Jangan mengubah logic data, fetching, routing, atau perilaku bisnis. Ini murni pekerjaan UI/presentasi. Kalau menemukan sesuatu yang butuh perubahan logic, catat di laporan akhir, jangan diubah.

---

## Konteks kondisi saat ini (hasil audit)

- Tidak ada design token. Semua warna/spacing/radius adalah class Tailwind mentah yang di-copy-paste per file. `@theme inline` di `globals.css` hanya berisi `--color-background` dan `--color-foreground` yang jarang dipakai.
- Warna: netral dominan (`white` untuk card/table/header, `neutral-50` untuk body dan thead, `neutral-100/200/300` untuk border & disabled, `neutral-400/500/600/900` untuk teks). Amber = warning/notice. Red = overdue/danger. Tidak ada warna success. Dark mode sengaja dimatikan (`color-scheme: light`).
- Tipografi: font Geist di-load tapi tidak terpakai karena `body` di `globals.css` meng-override ke `Arial, Helvetica, sans-serif` (bug). Ukuran `text-xs` s/d `text-2xl`. Weight hanya `font-medium` dan `font-semibold`.
- Komponen: hanya `StatCard` yang reusable. 3 varian button (outline, primary hitam, text-link), tidak ada yang identik di 2 tempat.
- Radius hanya `rounded` dan `rounded-lg`. Shadow tidak dipakai sama sekali. Tidak ada icon library. Breakpoint yang dipakai hanya `sm:` dan `lg:`.
- Inkonsistensi yang wajib diselesaikan lewat design system ini:
  1. Spacing vertikal halaman berbeda (`space-y-8` vs `space-y-6`).
  2. Tabel di Reports tidak punya padding horizontal (`px-4`) seperti tabel lain.
  3. Grid StatCard di Project Detail (6 card, `lg:grid-cols-4`) menyisakan 2 card di baris terakhir.
  4. Badge "estimate tidak terhitung" punya 3 bentuk DOM berbeda di 3 halaman.
  5. Empty state Overview ("belum ada data") dan `ConfigNotice` berbeda visual padahal maksudnya sama.

---

## Prinsip design system

1. **Compact, bukan sempit.** Kepadatan informasi tinggi (dashboard kerja), tapi setiap elemen tetap punya ruang napas minimum yang konsisten. Kontrol 32px di desktop, 36px di mobile agar tetap nyaman disentuh.
2. **Depth dari border dan kontras, bukan shadow.** Shadow tetap nol. Hierarki dibangun lewat `canvas` → `surface` → `surface-muted` dan dua level border.
3. **Radius yang kontras.** 4px untuk kontrol kecil (button, input, badge kotak), 12px untuk container (card, table wrapper, notice). Badge status memakai pill (`rounded-full`).
4. **Satu makna, satu komponen.** Pesan yang sama (misal "estimate tidak terhitung", "belum ada data") selalu dirender oleh komponen yang sama dengan DOM yang sama.
5. **Mobile-first.** Tulis class dasar untuk mobile, lalu tambah `sm:`/`md:`/`lg:` untuk layar lebih besar.
6. **Aksen ungu dipakai hemat.** `primary` hanya untuk aksi utama, state aktif (nav, tab), dan focus ring. Jangan untuk dekorasi atau teks panjang.

---

## 1. Token: `app/globals.css` (ganti seluruh isinya)

```css
@import "tailwindcss";

@theme inline {
  /* Font */
  --font-sans: var(--font-instrument-sans), ui-sans-serif, system-ui, sans-serif;

  /* Surface */
  --color-canvas: #f4f2f5;
  --color-surface: #ffffff;
  --color-surface-muted: #f8f6f9;
  --color-surface-hover: #f1edf3;

  /* Border */
  --color-line: #e4dfe7;
  --color-line-strong: #cfc7d4;

  /* Text */
  --color-fg: #221a27;          /* judul, angka, isi utama        */
  --color-fg-muted: #57495f;    /* teks sekunder, label form       */
  --color-fg-subtle: #6f6177;   /* meta, header tabel, caption     */
  --color-fg-faint: #a597ac;    /* hanya dekoratif/placeholder (kontras rendah, jangan untuk info penting) */
  --color-fg-disabled: #cfc7d4;

  /* Primary (aubergine) */
  --color-primary: #54305f;
  --color-primary-hover: #43254c;
  --color-primary-fg: #ffffff;
  --color-primary-soft: #f1e9f4; /* background state aktif (nav/tab terpilih) */
  --color-focus: #54305f;

  /* Status */
  --color-warning: #7f5500;
  --color-warning-bg: #fdf7e8;
  --color-warning-line: #edd69a;
  --color-danger: #a8283a;
  --color-danger-bg: #fcf0f1;
  --color-danger-line: #f0c3c8;
  --color-danger-hover: #8c1f30;
  --color-success: #246a48;
  --color-success-bg: #eef6f1;
  --color-success-line: #c2dece;
  --color-info: #3d4f7a;
  --color-info-bg: #eff2f9;
  --color-info-line: #c9d2e8;

  /* Radius */
  --radius-control: 4px;
  --radius-card: 12px;

  /* Type scale compact (ukuran / line-height) */
  --text-xs: 0.75rem;     --text-xs--line-height: 1rem;       /* 12/16 caption, badge, header tabel */
  --text-sm: 0.8125rem;   --text-sm--line-height: 1.25rem;    /* 13/20 body default, tabel, input   */
  --text-base: 0.875rem;  --text-base--line-height: 1.375rem; /* 14/22 paragraf, judul card         */
  --text-lg: 1rem;        --text-lg--line-height: 1.5rem;     /* 16/24 judul section                */
  --text-xl: 1.125rem;    --text-xl--line-height: 1.625rem;   /* 18/26 judul halaman mobile         */
  --text-2xl: 1.375rem;   --text-2xl--line-height: 1.75rem;   /* 22/28 judul halaman desktop, nilai StatCard */

  /* Breakpoint: md resmi ditambahkan untuk switch tabel → card */
  --breakpoint-sm: 40rem;  /* 640  */
  --breakpoint-md: 48rem;  /* 768  */
  --breakpoint-lg: 64rem;  /* 1024 */
}

:root {
  color-scheme: light;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--color-canvas);
  color: var(--color-fg);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--text-sm--line-height);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

Di `app/layout.tsx`, load font lewat `next/font/google` dan hapus Geist bila tidak dipakai lagi:

```tsx
import { Instrument_Sans } from "next/font/google";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
  display: "swap",
});

// <html lang="id" className={instrumentSans.variable}>
// <body className="font-sans antialiased">
```

**Aturan pemakaian token:**

| Kebutuhan | Class |
|---|---|
| Background halaman | `bg-canvas` |
| Card, tabel, header app | `bg-surface` |
| Thead, area sekunder, disabled field | `bg-surface-muted` |
| Hover baris / item | `hover:bg-surface-hover` |
| Border default / border kontrol | `border-line` / `border-line-strong` |
| Teks utama / sekunder / meta | `text-fg` / `text-fg-muted` / `text-fg-subtle` |
| Placeholder | `placeholder:text-fg-faint` |
| Radius kontrol / container | `rounded-control` / `rounded-card` |
| Weight | hanya `font-normal`, `font-medium`, `font-semibold` |

Class warna mentah Tailwind (`neutral-*`, `gray-*`, `amber-*`, `red-*`, `green-*`, `white`, `black`) dilarang di luar `globals.css`. Shadow (`shadow-*`) dilarang.

---

## 2. Spacing & layout (compact)

Gunakan skala ini secara konsisten, jangan menambah nilai baru:

| Konteks | Mobile | ≥ sm / lg |
|---|---|---|
| Padding horizontal halaman | `px-4` | `sm:px-6 lg:px-8` |
| Padding vertikal halaman | `py-4` | `lg:py-6` |
| Jarak antar section halaman | `gap-4` | `lg:gap-6` |
| Jarak di dalam section | `gap-3` | `gap-3` |
| Padding card | `p-3` | `sm:p-4` |
| Padding sel tabel | n/a (jadi card) | `px-4 py-2.5` untuk semua tabel, termasuk Reports |
| Gap grid card | `gap-3` | `gap-3` |
| Max width konten | `max-w-screen-xl mx-auto` | |

Halaman selalu dibungkus `PageShell` (lihat komponen) sehingga inkonsistensi `space-y-8` vs `space-y-6` hilang: tidak boleh ada `space-y-*` di level halaman.

Tinggi kontrol: `h-9 sm:h-8` (36px mobile, 32px desktop). Ukuran `sm`: `h-8 sm:h-7`.

---

## 3. Icon

Tambahkan `lucide-react`. Aturan:
- Ukuran `size-4` (16px) di button/input, `size-3.5` di badge.
- Stroke default. Warna mengikuti `currentColor`.
- Icon selalu berdampingan dengan teks, kecuali tombol icon-only yang wajib punya `aria-label`.
- Tombol Sync memakai icon `RefreshCw` + teks "Sync", icon berputar (`animate-spin`) saat proses berjalan.

---

## 4. Komponen (`components/ui/`)

Buat util `lib/cn.ts` (pakai `clsx` + `tailwind-merge`). Semua komponen menerima `className` dan meneruskan props native. Export semuanya dari `components/ui/index.ts`.

### 4.1 `Button`

Varian: `primary`, `secondary` (pengganti outline), `ghost`, `link` (pengganti text-link), `danger`. Ukuran: `sm`, `md` (default). Props tambahan: `loading`, `leftIcon`, `rightIcon`, `fullWidth`. Bisa dirender sebagai `<Link>` via prop `asChild` atau `href`.

```tsx
const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium " +
  "transition-colors disabled:pointer-events-none disabled:bg-surface-muted disabled:text-fg-disabled disabled:border-line";

const variants = {
  primary:   "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-hover",
  ghost:     "text-fg-muted hover:bg-surface-hover hover:text-fg",
  link:      "h-auto px-0 text-primary underline-offset-4 hover:underline disabled:bg-transparent",
  danger:    "bg-danger text-primary-fg hover:bg-danger-hover",
};

const sizes = {
  sm: "h-8 px-2.5 text-xs sm:h-7",
  md: "h-9 px-3 text-sm sm:h-8",
};
```

`loading` menampilkan `Loader2` berputar, men-disable tombol, dan mempertahankan lebar teks.

### 4.2 `Card`, `CardHeader`, `CardBody`

- `Card`: `rounded-card border border-line bg-surface`, tanpa shadow.
- `CardHeader`: `flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:px-4`. Judul `text-base font-semibold`, deskripsi opsional `text-xs text-fg-subtle`. Slot `actions` di kanan yang turun ke baris bawah bila sempit (`flex-wrap`).
- `CardBody`: `p-3 sm:p-4`.

### 4.3 `PageShell` & `PageHeader`

- `PageShell`: `mx-auto flex w-full max-w-screen-xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8 lg:py-6`.
- `PageHeader` props: `title`, `description?`, `actions?`, `breadcrumb?`.
  - Layout: `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`.
  - Judul `text-xl font-semibold lg:text-2xl`, `min-w-0 break-words`.
  - `actions`: `flex flex-wrap gap-2`. Di mobile, aksi primary boleh `fullWidth` bila hanya satu aksi.

### 4.4 `Section`

Pembungkus section dengan judul opsional: `flex flex-col gap-3`, judul `text-lg font-semibold`, aksi di kanan (wrap di mobile).

### 4.5 `StatCard` & `StatGrid`

`StatCard` props: `label`, `value`, `hint?`, `tone?: "default" | "danger" | "warning" | "success"`, `badge?`.
- Card `p-3 sm:p-4`, `min-w-0`.
- Label `text-xs text-fg-subtle truncate` (dengan `title` attribute berisi label penuh).
- Value `text-xl font-semibold tabular-nums sm:text-2xl`, `break-words` agar angka besar tidak keluar card. `tone` hanya mewarnai value.
- Hint `text-xs text-fg-subtle`, maksimal 2 baris (`line-clamp-2`).

`StatGrid` menentukan kolom otomatis dari jumlah children agar tidak ada baris yatim (menyelesaikan inkonsistensi #3):

| Jumlah card | Mobile | sm | lg |
|---|---|---|---|
| 2 | 2 | 2 | 2 |
| 3 | 2 (card terakhir `col-span-2`) | 3 | 3 |
| 4 | 2 | 2 | 4 |
| 5 | 2 (card terakhir `col-span-2`) | 3 | 5 |
| 6 | 2 | 3 | 3 (atau 6 bila lebar cukup, pilih 3) |

Aturan umum: di mobile selalu 2 kolom, dan bila jumlah ganjil, card terakhir `col-span-2`. Grid `grid gap-3`.

### 4.6 `Badge`

Props: `tone: "neutral" | "warning" | "danger" | "success" | "info" | "primary"`, `icon?`.
- `inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium`.
- Teks di dalam badge `truncate`.
- Mapping tone: `neutral` → `bg-surface-muted text-fg-muted border-line`; `warning` → `bg-warning-bg text-warning border-warning-line`; dst.

Buat badge semantik turunan dengan DOM tunggal (menyelesaikan inkonsistensi #4):
- `EstimateMissingBadge` → `<Badge tone="warning" icon={<AlertTriangle/>}>Estimate tidak terhitung</Badge>`. Opsional prop `count` → "3 task tanpa estimate".
- `OverdueBadge` → `tone="danger"`, teks "Overdue" atau "Overdue {n} hari".
- `StatusBadge` → map status proyek/task ke tone (selesai = success, berjalan = neutral/info, overdue = danger).

Semua halaman wajib memakai badge ini, hapus markup badge lama.

### 4.7 `Notice` & `EmptyState` (menyelesaikan inkonsistensi #5)

Keduanya berbagi anatomi yang sama: icon, judul, deskripsi, aksi opsional.

`Notice` (inline, di dalam alur halaman):
- Props: `tone: "info" | "warning" | "danger" | "success"`, `title`, `children?`, `action?`.
- `flex gap-3 rounded-card border p-3 sm:p-4` + warna tone. Di mobile, `action` turun ke bawah teks (`flex-col sm:flex-row`).
- `ConfigNotice` di-refactor menjadi `<Notice tone="warning" .../>`.

`EmptyState` (pengganti konten yang kosong):
- Props: `icon?`, `title`, `description?`, `action?`.
- `flex flex-col items-center gap-2 px-4 py-8 text-center`, icon dalam lingkaran `size-10 rounded-full bg-surface-muted text-fg-subtle`, judul `text-base font-medium text-fg`, deskripsi `text-sm text-fg-subtle max-w-sm`.
- Bila empty state disebabkan konfigurasi belum lengkap, gunakan `EmptyState` yang sama dengan `action` menuju halaman konfigurasi, dan teks yang sama dengan `ConfigNotice`. Satu makna = satu pesan.
- Copy empty state harus mengarahkan aksi, contoh: judul "Belum ada data untuk periode ini", deskripsi "Jalankan Sync untuk menarik task terbaru.", aksi tombol "Sync sekarang".

### 4.8 Form: `Field`, `Input`, `Select`, `Textarea`, `Checkbox`

- `Field` props: `label`, `hint?`, `error?`, `required?`, `children`. Layout `flex flex-col gap-1`. Label `text-xs font-medium text-fg-muted`. Hint `text-xs text-fg-subtle`. Error `text-xs text-danger` + `aria-describedby`.
- `Input`/`Select`: `h-9 sm:h-8 w-full min-w-0 rounded-control border border-line-strong bg-surface px-2.5 text-sm text-fg placeholder:text-fg-faint focus-visible:border-primary disabled:bg-surface-muted disabled:text-fg-disabled`. State error: `border-danger`.
- Di mobile input selalu full width. Font input minimum 13px; tambahkan `text-base sm:text-sm` pada input bila iOS melakukan auto-zoom (iOS zoom di bawah 16px, jadi di mobile pakai `text-[16px] sm:text-sm` khusus untuk `input`, `select`, `textarea`).
- Form grid: `grid gap-3 sm:grid-cols-2`, field yang panjang `sm:col-span-2`.
- `FilterBar`: `flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end`, tiap filter `sm:w-48`, tombol reset di ujung.

### 4.9 `DataTable` (tabel desktop → card di mobile)

Satu komponen untuk semua tabel di app. Di `md` ke atas render `<table>`, di bawah `md` render daftar card. Keduanya dari konfigurasi kolom yang sama, sehingga tidak ada duplikasi markup per halaman.

```tsx
type Align = "left" | "right" | "center";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: Align;             // angka selalu "right"
  width?: string;            // contoh "w-32", hanya untuk desktop
  nowrap?: boolean;
  mobile?: "title" | "subtitle" | "badge" | "field" | "hidden";
  // title    → baris judul card (bold), maksimal 1 kolom
  // subtitle → teks kecil di bawah judul
  // badge    → pojok kanan atas card
  // field    → pasangan label/nilai di body card (default)
  // hidden   → tidak ditampilkan di mobile
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;   // atau rowHref
  rowHref?: (row: T) => string;
  empty?: React.ReactNode;          // default <EmptyState .../>
  loading?: boolean;                // tampilkan skeleton 5 baris / 3 card
  footer?: React.ReactNode;         // total, pagination
  caption?: string;                 // sr-only untuk aksesibilitas
};
```

**Desktop (`hidden md:block`):**
- Wrapper `overflow-x-auto rounded-card border border-line bg-surface`.
- `<table className="w-full text-sm">`.
- `thead`: `bg-surface-muted`, `th` = `px-4 py-2 text-left text-xs font-medium text-fg-subtle whitespace-nowrap border-b border-line`.
- `td` = `px-4 py-2.5 border-b border-line align-middle`, baris terakhir tanpa border. Padding ini wajib sama di SEMUA tabel (termasuk Reports).
- Kolom angka: `text-right tabular-nums whitespace-nowrap`.
- Kolom teks panjang: `max-w-[280px] truncate` dengan `title` attribute.
- Baris yang bisa diklik: `cursor-pointer hover:bg-surface-hover`, dan tetap bisa diakses keyboard (link di sel judul).
- Header tabel boleh sticky di dalam wrapper bila tabel panjang.

**Mobile (`md:hidden`):**
- Daftar: `flex flex-col gap-2`.
- Tiap card: `rounded-card border border-line bg-surface p-3`, bila bisa diklik seluruh card adalah link dengan `active:bg-surface-hover`.
- Anatomi card:
  ```
  ┌─────────────────────────────────────┐
  │ Judul (title)           [badge]     │  ← flex items-start justify-between gap-2
  │ subtitle                            │     judul: min-w-0 font-medium break-words line-clamp-2
  │─────────────────────────────────────│     badge: shrink-0
  │ Label A        Nilai A              │  ← <dl> grid grid-cols-2 gap-x-3 gap-y-1.5
  │ Label B        Nilai B              │     dt: text-xs text-fg-subtle
  │ Label C        Nilai C              │     dd: text-sm text-right tabular-nums break-words
  └─────────────────────────────────────┘
  ```
- Bila kolom `field` lebih dari 6, tampilkan 4 pertama dan sisanya dalam `<details>` "Lihat detail".
- Bila tidak ada kolom `mobile: "title"`, kolom pertama otomatis menjadi title.
- `footer` (total/pagination) tampil sebagai card terpisah di bawah daftar dengan layout yang sama.

**Pagination:** komponen `Pagination` kecil: di desktop "Menampilkan 1–20 dari 184" + tombol prev/next; di mobile hanya tombol prev/next full width dengan teks halaman di tengah.

### 4.10 Navigasi: `AppHeader` & `NavTabs`

- `AppHeader`: `sticky top-0 z-20 border-b border-line bg-surface`, tinggi `h-12`. Isi: nama app (`font-semibold truncate`), navigasi, tombol Sync.
- Desktop (`md:`): nav horizontal, item aktif `text-fg font-medium` dengan indikator bawah 2px `bg-primary`; item lain `text-fg-subtle hover:text-fg`.
- Mobile: nav pindah ke baris kedua sebagai tab yang bisa di-scroll horizontal (`overflow-x-auto`, `whitespace-nowrap`, tanpa scrollbar terlihat) atau ke menu sheet. Tombol Sync di mobile menjadi icon-only `size-9` dengan `aria-label="Sync"`.
- `NavTabs` untuk tab di dalam halaman (misal Project Detail): pola yang sama, item aktif memakai `bg-primary-soft text-primary` atau garis bawah primary, pilih satu dan konsisten.

### 4.11 Pendukung

- `Skeleton`: `animate-pulse rounded-control bg-surface-muted`.
- `Divider`: `h-px bg-line`.
- `KeyValue` / `DescriptionList`: pola `dl` yang sama dengan card mobile DataTable, untuk info proyek di Project Detail.
- `Tooltip` opsional (native `title` cukup bila belum ada library).

---

## 5. Aturan anti-tumpuk (wajib di semua komponen dan halaman)

1. Setiap child flex yang berisi teks diberi `min-w-0`, dan teks yang bisa panjang diberi `truncate` (1 baris, dengan `title`) atau `break-words` / `line-clamp-2` (multi-baris). Jangan biarkan teks tanpa aturan overflow.
2. Baris yang berisi judul + aksi selalu `flex flex-wrap gap-2` atau `flex-col sm:flex-row`. Tidak ada `justify-between` tanpa `gap`.
3. Angka memakai `tabular-nums whitespace-nowrap`. Nilai uang/jam yang panjang boleh diringkas di mobile (misal `1,2 rb j`) lewat formatter, dengan nilai penuh di `title`.
4. Tidak ada lebar tetap dalam `px` pada container di mobile. Gunakan `w-full`, `max-w-*`, `min-w-0`, grid, atau flex.
5. Tidak boleh ada scroll horizontal di level halaman pada lebar 360px. Satu-satunya elemen yang boleh scroll horizontal adalah nav tab mobile dan wrapper tabel desktop.
6. Label dan nilai di card mobile tidak pernah berbagi baris tanpa grid (gunakan `dl` grid 2 kolom), sehingga tidak saling tabrak.
7. Badge dan tombol memakai `shrink-0`, teks di sebelahnya yang mengalah (`min-w-0 truncate`).
8. Tinggi baris tabel dan card mengikuti isi, jangan pakai `h-*` tetap untuk elemen berisi teks.
9. Gunakan `text-balance` untuk judul halaman dan judul empty state agar tidak ada satu kata yatim.

---

## 6. Migrasi halaman

Kerjakan per halaman, setelah semua komponen `components/ui/` selesai:

**Overview**
- Bungkus dengan `PageShell` + `PageHeader` (judul, info sinkron terakhir, aksi).
- 5 stat → `StatGrid` + `StatCard` (mobile 2 kolom, card ke-5 `col-span-2`; lg 5 kolom).
- `ConfigNotice` → `Notice tone="warning"`.
- Empty state "belum ada data" → `EmptyState` (lihat 4.7).
- Semua tabel → `DataTable` dengan konfigurasi `mobile` per kolom.

**Project Detail**
- `PageHeader` dengan breadcrumb kembali ke daftar proyek.
- 6 stat → `StatGrid` (mobile 2×3, sm 3×2, lg 3×2). Tidak ada lagi baris sisa 2.
- Info proyek → `DescriptionList`.
- Tabel task → `DataTable`, kolom nama task = `title`, status = `badge`, assignee = `subtitle`, jam/estimasi/deadline = `field`.
- Badge estimate → `EstimateMissingBadge`.

**Reports**
- Filter → `FilterBar` + `Field`.
- Tabel → `DataTable` (otomatis mendapat `px-4` yang hilang).
- Total di baris bawah → `footer` DataTable.
- Badge estimate → `EstimateMissingBadge`.

**Semua halaman lain** yang ditemukan: terapkan pola yang sama.

Setelah migrasi, hapus komponen/markup lama yang tidak terpakai.

---

## 7. Kriteria selesai (cek semuanya sebelum melapor)

- [ ] `grep -rnE "(neutral|gray|amber|red|green|slate|zinc)-[0-9]{2,3}|bg-white|text-white|bg-black|shadow-" app components` tidak menghasilkan apa pun di luar `globals.css`.
- [ ] `grep -rn "space-y-" app` tidak menemukan `space-y-*` di level halaman.
- [ ] Font yang ter-render adalah Instrument Sans (cek di DevTools → Computed → font-family), bukan Arial.
- [ ] Badge "estimate tidak terhitung" di semua halaman dirender oleh `EstimateMissingBadge` dengan DOM identik.
- [ ] Empty state Overview dan notice konfigurasi memakai anatomi yang sama.
- [ ] Semua tabel memakai `DataTable` dengan padding sel identik.
- [ ] Tidak ada grid StatCard dengan baris yatim di breakpoint mana pun.
- [ ] Diuji manual di lebar 360, 390, 430, 768, 1024, 1280, 1440 px:
  - tidak ada scroll horizontal halaman,
  - tidak ada teks/label/angka yang bertumpuk atau keluar container,
  - di bawah 768px semua tabel tampil sebagai card,
  - header, filter, dan aksi turun baris dengan rapi.
- [ ] Semua kontrol bisa dijangkau keyboard dan menampilkan focus ring ungu.
- [ ] Kontras teks utama dan sekunder ≥ 4.5:1 (`fg-faint` tidak dipakai untuk informasi penting).
- [ ] `npm run lint` dan `npm run build` lolos tanpa error baru.

---

## 8. Format laporan akhir

Setelah selesai, laporkan:
1. Daftar file baru dan file yang diubah.
2. Daftar komponen di `components/ui/` beserta props singkatnya.
3. Bagaimana tiap dari 5 inkonsistensi audit diselesaikan.
4. Hal yang sengaja tidak diubah (terutama yang menyentuh logic) dan alasannya.
5. Catatan sisa atau rekomendasi lanjutan.
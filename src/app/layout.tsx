import type { Metadata } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import { AppHeader } from "@/components/ui/AppHeader";
import SyncStatus from "@/components/SyncStatus";
import LogoutButton from "@/components/LogoutButton";
import "./globals.css";

// Fredoka: chunky rounded display face — headings, buttons, nav, badges.
// Fredoka has no 400 weight, so 500 is the floor (matches MASTER.md's scale).
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

// Nunito Sans: body/data face. Deliberately not plain Nunito — its more
// neutral terminals read better at 13px in dense tables. See MASTER.md.
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plane Recap",
  description: "Rekap & dashboard workspace Plane.so",
};

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/members", label: "Member Recap" },
  { href: "/reports", label: "Reports" },
  { href: "/snapshots", label: "Kunci Bulanan" },
  { href: "/kpi", label: "KPI" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${fredoka.variable} ${nunitoSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-fg antialiased">
        <AppHeader
          appName="Plane Recap"
          navItems={NAV_ITEMS}
          actions={
            <div className="flex items-center gap-1">
              <SyncStatus />
              <LogoutButton />
            </div>
          }
        />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

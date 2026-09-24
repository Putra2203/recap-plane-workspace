import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { AppHeader } from "@/components/ui/AppHeader";
import SyncStatus from "@/components/SyncStatus";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
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
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${instrumentSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-fg antialiased">
        <AppHeader appName="Plane Recap" navItems={NAV_ITEMS} actions={<SyncStatus />} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

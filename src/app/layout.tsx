import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <span className="font-semibold text-lg">Plane Recap</span>
            <nav className="flex gap-6 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="text-neutral-600 hover:text-neutral-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

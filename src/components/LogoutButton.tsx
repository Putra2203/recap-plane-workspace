"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const logout = () => {
    setLoading(true);
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      // A hard navigation, not router.push() — deliberate: this is an auth
      // boundary crossing, and it should wipe every client-side cache (SWR,
      // React state) rather than carry any of it into the logged-out view.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    });
  };

  const icon = <LogOut className="size-4" />;

  return (
    <>
      {/* Mobile: icon-only, matches SyncStatus's own icon-only/icon+text split */}
      <Button variant="ghost" size="md" className="aspect-square px-0 sm:hidden" onClick={logout} disabled={loading} aria-label="Keluar">
        {icon}
      </Button>
      <Button variant="ghost" size="md" className="hidden sm:inline-flex" onClick={logout} disabled={loading} leftIcon={icon}>
        Keluar
      </Button>
    </>
  );
}

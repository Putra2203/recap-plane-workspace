"use client";

import { useState, type FormEvent } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";

// Reads `next` from location.search directly instead of useSearchParams() —
// that hook requires wrapping the page in a Suspense boundary in the App
// Router, which this one-field form doesn't need to carry just to know
// where to redirect after login.
function nextPath(): string {
  if (typeof window === "undefined") return "/";
  const raw = new URLSearchParams(window.location.search).get("next");
  // Only ever redirect within this app — an open redirect via `next` would
  // let a crafted login link send someone to an external site right after
  // they hand over the shared password.
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal login");
        window.location.href = nextPath();
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    // min-h-dvh, not min-h-full: this div sits inside html > body > main,
    // and min-h-full (min-height:100%) only centers correctly if every
    // ancestor in that chain resolves a definite height through percentages
    // — body/main do it via min-h-full + flex-1, which is exactly the kind
    // of multi-level percentage chain that's fragile in practice (it broke
    // here: the card rendered pinned to the top instead of centered). A
    // viewport unit sidesteps ancestor height resolution entirely.
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      {/* Decorative ambient background — genjutsu paint (light scope, see
          globals.css's canopy-drift-* comment for the thesis). Purely
          visual: aria-hidden + pointer-events-none, three low-opacity
          blurred shapes in existing Canopy tokens drifting slowly and
          independently so they never read as a synced pulse. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="canopy-login-shape-a absolute size-72 rounded-full bg-primary/20 blur-3xl"
          style={{ top: "8%", left: "6%" }}
        />
        <div
          className="canopy-login-shape-b absolute size-64 rounded-full bg-accent/25 blur-3xl"
          style={{ bottom: "10%", right: "8%" }}
        />
        <div
          className="canopy-login-shape-c absolute size-56 rounded-full bg-info/20 blur-3xl"
          style={{ top: "58%", left: "62%" }}
        />
      </div>

      <div className="canopy-login-enter relative w-full max-w-sm">
        <Card>
          <CardHeader title="Plane Recap" description="Masukkan password tim untuk masuk." />
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Password" required>
                <Input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? true : undefined}
                />
              </Field>
              {error && (
                <Notice tone="danger" title="Gagal masuk">
                  {error}
                </Notice>
              )}
              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Masuk
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

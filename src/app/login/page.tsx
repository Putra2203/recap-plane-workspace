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
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
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

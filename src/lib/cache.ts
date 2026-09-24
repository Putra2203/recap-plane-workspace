// Minimal in-process TTL cache. The Plane instance we talk to enforces a
// strict rate limit (Cloudflare-fronted self-hosted deployment observed
// returning Retry-After: 39s under moderate burst load), so re-fetching the
// same project's data on every dashboard view/report generation is not
// viable. This is a single-process cache — fine for a single Next.js
// server; swap for Redis if this ever runs multi-instance.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const value = await fn();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

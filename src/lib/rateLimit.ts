interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>();
const WINDOW_MS = 60_000;

// Limpieza cada 5 minutos
setInterval(() => {
  const now = Date.now();
  store.forEach((v, k) => {
    if (now > v.resetAt) store.delete(k);
  });
}, 300_000).unref?.();

export function checkRateLimit(
  key: string,
  limit: number
): { ok: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true, remaining: limit - entry.count };
}

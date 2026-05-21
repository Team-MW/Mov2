/**
 * Rate Limiter — Lightweight in-memory rate limiting.
 * Perfect for serverless environments with short-lived containers,
 * or persistent Node servers in Hybrid SSR mode.
 */
interface LimitEntry {
  count: number;
  resetTime: number;
}

const cache = new Map<string, LimitEntry>();

// Clean up expired entries every 5 minutes to avoid memory leaks
if (globalThis && !(globalThis as any).__rateLimitInterval) {
  (globalThis as any).__rateLimitInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now > value.resetTime) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function isRateLimited(
  ip: string,
  limit: number = 5,
  windowMs: number = 60000
): { limited: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const key = ip;
  
  let record = cache.get(key);
  
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
  }
  
  record.count++;
  cache.set(key, record);
  
  const limited = record.count > limit;
  const remaining = Math.max(0, limit - record.count);
  
  return {
    limited,
    remaining,
    reset: Math.ceil((record.resetTime - now) / 1000),
  };
}

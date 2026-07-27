const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count++;
  return {
    allowed: current.count <= limit,
    retryAfter: Math.ceil((current.reset - now) / 1000),
  };
}

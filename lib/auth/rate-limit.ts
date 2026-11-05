interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (keyed by action:identifier)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Enforce rate limiting with sliding window
 * @param key Unique key for the rate limit (e.g. `login:user@example.com` or `ip:1.2.3.4`)
 * @param maxAttempts Maximum attempts allowed within window
 * @param windowSeconds Duration of the rate limit window in seconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900 // 15 minutes default
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      success: true,
      remaining: maxAttempts - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (record.count >= maxAttempts) {
    const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  record.count += 1;
  const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);
  return {
    success: true,
    remaining: maxAttempts - record.count,
    resetInSeconds,
  };
}

/**
 * Reset rate limit counter on successful authentication
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

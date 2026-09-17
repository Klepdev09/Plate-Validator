/**
 * Shared in-memory result cache + per-IP rate limiting for live plate checks.
 * Process-local only — fine for a single Node process; not shared across workers.
 */

const CACHE_TTL_MS = 5 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const resultCache = new Map<string, CacheEntry<unknown>>()
const ipHits = new Map<string, number[]>()

export function getCachedResult<T>(key: string): T | null {
  const entry = resultCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    resultCache.delete(key)
    return null
  }
  return entry.value as T
}

export function setCachedResult<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
  resultCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/** Returns true if the request is allowed; false if rate-limited. */
export function allowRequest(ip: string): boolean {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  )
  if (recent.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, recent)
    return false
  }
  recent.push(now)
  ipHits.set(ip, recent)
  return true
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return request.headers.get("x-real-ip") || "unknown"
}

export function cacheKey(state: string, plate: string, extra = ""): string {
  return `${state}:${plate.toUpperCase()}:${extra}`
}

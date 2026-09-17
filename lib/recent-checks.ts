export const RECENT_CHECKS_STORAGE_KEY = "plateping.recentChecks"
export const RECENT_CHECKS_LIMIT = 20

export type RecentCheckResultType =
  | "available"
  | "taken"
  | "not-allowed"
  | "valid-format"
  | "invalid-format"
  | "error"

export type RecentCheck = {
  id: string
  stateName: string
  plate: string
  checkedAt: string
  resultType?: RecentCheckResultType
}

const RESULT_TYPES = new Set<RecentCheckResultType>([
  "available",
  "taken",
  "not-allowed",
  "valid-format",
  "invalid-format",
  "error",
])

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function asResultType(value: unknown): RecentCheckResultType | undefined {
  return typeof value === "string" && RESULT_TYPES.has(value as RecentCheckResultType)
    ? (value as RecentCheckResultType)
    : undefined
}

function normalizeEntry(raw: unknown): RecentCheck | null {
  if (!raw || typeof raw !== "object") return null

  const entry = raw as Record<string, unknown>
  const plate = asString(entry.plate) ?? asString(entry.plateText)
  const stateName = asString(entry.stateName) ?? asString(entry.state)
  const checkedAt =
    asString(entry.checkedAt) ??
    asString(entry.timestamp) ??
    asString(entry.checked)

  if (!plate || !stateName || !checkedAt) return null

  return {
    id: asString(entry.id) ?? `${checkedAt}:${stateName}:${plate}`,
    stateName,
    plate,
    checkedAt,
    resultType: asResultType(entry.resultType) ?? asResultType(entry.result),
  }
}

function readStore(): RecentCheck[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(RECENT_CHECKS_STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is RecentCheck => entry !== null)
      .sort(
        (a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt)
      )
      .slice(0, RECENT_CHECKS_LIMIT)
  } catch {
    return []
  }
}

function writeStore(entries: RecentCheck[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    RECENT_CHECKS_STORAGE_KEY,
    JSON.stringify(entries.slice(0, RECENT_CHECKS_LIMIT))
  )
}

export function getRecentChecks(): RecentCheck[] {
  return readStore()
}

export function recordRecentCheck(input: {
  stateName: string
  plate: string
  resultType: RecentCheckResultType
}): RecentCheck[] {
  const plate = input.plate.trim()
  const stateName = input.stateName.trim()
  if (!plate || !stateName) return readStore()

  const entry: RecentCheck = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}:${stateName}:${plate}`,
    stateName,
    plate,
    checkedAt: new Date().toISOString(),
    resultType: input.resultType,
  }

  const next = [entry, ...readStore()].slice(0, RECENT_CHECKS_LIMIT)
  writeStore(next)
  return next
}

export function clearRecentChecks() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(RECENT_CHECKS_STORAGE_KEY)
}

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`
}

/** Short relative time for recent-check timestamps, e.g. "5 minutes ago". */
export function formatRelativeTime(
  isoTimestamp: string,
  nowMs = Date.now()
): string {
  const then = Date.parse(isoTimestamp)
  if (Number.isNaN(then)) return "Unknown time"

  const deltaSec = Math.max(0, Math.round((nowMs - then) / 1000))

  if (deltaSec < 45) return "just now"
  if (deltaSec < 90) return "1 minute ago"

  const minutes = Math.round(deltaSec / 60)
  if (minutes < 60) return plural(minutes, "minute")

  const hours = Math.round(minutes / 60)
  if (hours < 24) return plural(hours, "hour")

  const days = Math.round(hours / 24)
  if (days < 30) return plural(days, "day")

  const months = Math.round(days / 30)
  if (months < 12) return plural(months, "month")

  return plural(Math.max(1, Math.round(days / 365)), "year")
}

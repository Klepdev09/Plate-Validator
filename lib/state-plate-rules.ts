/**
 * Per-state plate-check policy for PlatePing.
 * "live" = Playwright automation against an official public checker.
 * "format" = client/server format rules only.
 *
 * Texas is format-only: MyPlates.com (TxDMV vendor) Terms prohibit
 * "automated, electronic, high-volume processes, such as … robots, spiders,
 * data miners or scrapers".
 */

export type PlateCheckMode = "live" | "format"

export type StatePlateRule = {
  fips: string
  abbreviation: string
  name: string
  mode: PlateCheckMode
  /** API route for live checks, when mode === "live". */
  endpoint?: string
  notes?: string
}

export const NH_FIPS = "33"
export const FL_FIPS = "12"
export const OH_FIPS = "39"
export const PA_FIPS = "42"
export const TX_FIPS = "48"

export const STATE_PLATE_RULES: StatePlateRule[] = [
  {
    fips: NH_FIPS,
    abbreviation: "NH",
    name: "New Hampshire",
    mode: "live",
    endpoint: "/api/check-nh",
  },
  {
    fips: FL_FIPS,
    abbreviation: "FL",
    name: "Florida",
    mode: "live",
    endpoint: "/api/check-fl",
  },
  {
    fips: OH_FIPS,
    abbreviation: "OH",
    name: "Ohio",
    mode: "live",
    endpoint: "/api/check-oh",
  },
  {
    fips: PA_FIPS,
    abbreviation: "PA",
    name: "Pennsylvania",
    mode: "live",
    endpoint: "/api/check-pa",
  },
  {
    fips: TX_FIPS,
    abbreviation: "TX",
    name: "Texas",
    mode: "format",
    notes:
      "MyPlates.com ToS prohibits scrapers/bots; format-check only.",
  },
]

export function getStatePlateRule(fips: string | null | undefined) {
  if (!fips) return undefined
  return STATE_PLATE_RULES.find((rule) => rule.fips === fips)
}

export function isLiveCheckState(fips: string | null | undefined): boolean {
  return getStatePlateRule(fips)?.mode === "live"
}

export function liveCheckStates(): StatePlateRule[] {
  return STATE_PLATE_RULES.filter((rule) => rule.mode === "live")
}

/** Home subheading copy for currently confirmed live states. */
export function liveAvailabilitySubheading(): string {
  const live = liveCheckStates().map((rule) => rule.abbreviation)
  if (live.length === 0) {
    return "Format checks for every state."
  }
  if (live.length === 1) {
    return `Live availability for ${live[0]}. Format checks for every other state.`
  }
  if (live.length === 2) {
    return `Live availability for ${live[0]} and ${live[1]}. Format checks for every other state.`
  }
  const head = live.slice(0, -1).join(", ")
  const last = live[live.length - 1]
  return `Live availability for ${head}, and ${last}. Format checks for every other state.`
}

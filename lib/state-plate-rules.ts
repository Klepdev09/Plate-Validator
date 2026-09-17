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

import { getStateByFips, type USState } from "@/lib/states"
import { getStatePlateRule, isLiveCheckState } from "@/lib/state-plate-rules"

export type PlateValidationResult = {
  ok: boolean
  normalized: string
  state: USState
  mode: "availability" | "format"
  messages: string[]
}

const NH_FIPS = "33"
const FL_FIPS = "12"
const SYMBOLS = new Set(["&", "+", "-"])

function normalizePlate(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().replace(/0/g, "O")
}

function validateNewHampshire(plate: string): string[] {
  const errors: string[] = []

  if (plate.length === 0) {
    errors.push("Enter a plate to check.")
    return errors
  }

  if (plate.length > 7) {
    errors.push(
      "New Hampshire passenger vanity plates allow at most 7 characters."
    )
  }

  if (!/^[A-Z1-9&+-]+$/.test(plate)) {
    errors.push(
      "Only letters A–Z, numbers 1–9, and the symbols & + - are allowed."
    )
  }

  const symbolChars = plate.split("").filter((char) => SYMBOLS.has(char))
  if (symbolChars.length > 2) {
    errors.push("At most 2 symbols (&, +, -) are allowed.")
  }

  if (/[&+-]{2}/.test(plate)) {
    errors.push("Symbols cannot be consecutive (for example && or +-).")
  }

  const letterCount = (plate.match(/[A-Z]/g) ?? []).length
  if (letterCount === 0) {
    errors.push("The plate must include at least one letter.")
  }

  return errors
}

/** Generic vanity-style format check for non-NH states. */
function validateGenericFormat(plate: string, state: USState): string[] {
  const errors: string[] = []

  if (plate.length === 0) {
    errors.push("Enter a plate to check.")
    return errors
  }

  if (plate.length < 2) {
    errors.push("Use at least 2 characters.")
  }

  if (plate.length > 8) {
    errors.push(`${state.name} vanity-style checks allow at most 8 characters.`)
  }

  if (!/^[A-Z0-9]+$/.test(plate)) {
    errors.push("Only letters and numbers are allowed for this format check.")
  }

  if (!/[A-Z]/.test(plate)) {
    errors.push("Include at least one letter.")
  }

  return errors
}

export function checkPlate(
  stateFips: string | null,
  rawPlate: string
): PlateValidationResult {
  if (!stateFips) {
    return {
      ok: false,
      normalized: normalizePlate(rawPlate),
      state: { fips: "", name: "Unknown", abbreviation: "??" },
      mode: "format",
      messages: ["Choose a state first."],
    }
  }

  const state = getStateByFips(stateFips)
  if (!state) {
    return {
      ok: false,
      normalized: normalizePlate(rawPlate),
      state: { fips: stateFips, name: "Unknown", abbreviation: "??" },
      mode: "format",
      messages: ["Choose a valid state."],
    }
  }

  const normalized = normalizePlate(rawPlate)
  const isNh = state.fips === NH_FIPS
  const live = isLiveCheckState(state.fips)
  const liveName = getStatePlateRule(state.fips)?.name ?? state.name
  const errors = isNh
    ? validateNewHampshire(normalized)
    : validateGenericFormat(normalized, state)

  if (errors.length > 0) {
    return {
      ok: false,
      normalized,
      state,
      mode: live ? "availability" : "format",
      messages: errors,
    }
  }

  return {
    ok: true,
    normalized,
    state,
    mode: live ? "availability" : "format",
    messages: [
      live
        ? `“${normalized}” is a valid ${liveName} vanity plate format.`
        : `“${normalized}” passes the ${state.name} format check.`,
    ],
  }
}

export function allowedPlatePattern(stateFips: string | null): RegExp {
  if (stateFips === NH_FIPS) {
    return /[^A-Z0-9&+-]/g
  }
  if (stateFips === FL_FIPS) {
    return /[^A-Z0-9 -]/g
  }
  return /[^A-Z0-9]/g
}

export { NH_FIPS, FL_FIPS, normalizePlate }

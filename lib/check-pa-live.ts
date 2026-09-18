/**
 * Unofficial integration against PennDOT's public Personalized Registration
 * Plate Availability Tool (dmv.penndot.gov → dot*e.penndot.gov). This is not a
 * documented API — selectors and result wording may break if PA changes their page.
 *
 * Request contract (observed via Playwright / Network):
 * - Entry: https://www.dmv.penndot.gov/vehicle_services/vrvanity.jsp?navigation=true
 *   (redirects to www.dot{N}e.penndot.gov hosts)
 * - Step 2: POST AmsServlet.jsp with plateType=ST (Standard) + continueButton
 * - Step 3: GET AmsServlet.jsp?ni=… via Passenger link under #plateLinks
 * - Step 4: POST CHECK_PLATE with per-character inputs name=num (up to 7)
 * - Full document postbacks (not AJAX) — wait for navigation / load state
 * - Results (page body copy):
 *   - available: "Plate configuration requested is available."
 *   - taken: "…configuration previously issued and therefore not available."
 */

import "server-only"

import type { Browser } from "playwright-core"

import {
  LIVE_CHECK_TIMEOUT_MS,
  launchStealthBrowser,
  prepareStealthPage,
  withTimeout,
  type LiveCheckResult,
} from "@/lib/playwright-live"

export type PaLiveCheckResult = LiveCheckResult

export type PaLiveCheckInput = {
  plate: string
}

const START_URL =
  "https://www.dmv.penndot.gov/vehicle_services/vrvanity.jsp?navigation=true"

export function validatePaPlateText(raw: string): string | null {
  const plate = raw.trim().toUpperCase()
  if (!plate) return "Plate text is required."
  if (!/^[A-Z0-9]+$/.test(plate)) {
    return "Pennsylvania personalized plates allow letters and numbers only (no special characters)."
  }
  if (plate.length > 7) {
    return "Pennsylvania personalized plates allow at most 7 characters."
  }
  return null
}

function classifyPaText(text: string): LiveCheckResult {
  const normalized = text.replace(/\s+/g, " ")
  if (/configuration requested is available/i.test(normalized)) {
    return {
      status: "available",
      message: "Plate configuration requested is available.",
    }
  }
  if (
    /previously issued and therefore not available/i.test(normalized) ||
    /not available/i.test(normalized)
  ) {
    return {
      status: "taken",
      message:
        "The registration plate configuration you requested is a configuration previously issued and therefore not available.",
    }
  }
  if (/invalid|not allowed|not permitted|cannot/i.test(normalized)) {
    return {
      status: "not-allowed",
      message: normalized.match(/[^.!?]*(?:invalid|not allowed|not permitted|cannot)[^.!?]*[.!?]?/i)?.[0]?.trim()
        || "Configuration was rejected by PennDOT.",
    }
  }
  return {
    status: "error",
    message: "Unrecognized PennDOT availability result.",
  }
}

async function runPaFlow(plate: string): Promise<LiveCheckResult> {
  let browser: Browser | undefined
  try {
    browser = await launchStealthBrowser()
    const { page } = await prepareStealthPage(browser)

    await page.goto(START_URL, {
      waitUntil: "domcontentloaded",
      timeout: 12_000,
    })
    await page.waitForSelector("#standard")
    await page.check("#standard")
    await Promise.all([
      page.waitForLoadState("domcontentloaded"),
      page.click('input[name="continueButton"]'),
    ])

    await page.waitForSelector("#plateLinks a")
    await page.locator("#plateLinks a", { hasText: /^Passenger$/ }).click()
    await page.waitForSelector('input[name="num"][type="text"]')

    const chars = plate.split("")
    const inputs = page.locator('input[name="num"][type="text"]')
    const count = await inputs.count()
    for (let i = 0; i < Math.min(chars.length, count, 7); i++) {
      await inputs.nth(i).fill(chars[i])
    }

    await Promise.all([
      page.waitForLoadState("domcontentloaded"),
      page.click('input[value="Check Availability"]'),
    ])
    await page.waitForTimeout(500)

    const bodyText = await page.locator("body").innerText()
    if (process.env.NODE_ENV === "development") {
      console.log("[pa-live] result snippet:", bodyText.slice(0, 800))
    }

    return classifyPaText(bodyText)
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

export async function checkPaLiveAvailability(
  input: PaLiveCheckInput
): Promise<PaLiveCheckResult> {
  const plate = input.plate?.trim().toUpperCase() ?? ""
  const validationError = validatePaPlateText(plate)
  if (validationError) {
    return { status: "not-allowed", message: validationError }
  }

  try {
    return await withTimeout(runPaFlow(plate), LIVE_CHECK_TIMEOUT_MS, "PA plate check")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected PA plate check failure."
    if (process.env.NODE_ENV === "development") {
      console.error("[pa-live] error:", message)
    }
    return { status: "error", message }
  }
}

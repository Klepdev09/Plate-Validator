/**
 * Unofficial integration against Ohio BMV's public specialized/personalized
 * plate availability UI (bmvonline.dps.ohio.gov). This is not a documented
 * API — selectors and result wording may break if Ohio changes their page.
 *
 * Request contract (observed via Playwright / Network):
 * - Navigate to /bmvonline/oplates/specializedplates
 * - Choose Passenger → fill #PersonalizedPlateNumber
 * - Click "Check Availability" link
 * - AJAX GET /bmvonline/oplates/PlatePreview?plateNumber=...&vehicleClass=PC&organizationCode=0
 * - HTML fragment:
 *   - available: .alert-success "This plate number is currently available."
 *   - taken: .alert-danger … "Plate is issued."
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

export type OhLiveCheckResult = LiveCheckResult

export type OhLiveCheckInput = {
  plate: string
}

const START_URL =
  "https://bmvonline.dps.ohio.gov/bmvonline/oplates/specializedplates"

export function validateOhPlateText(raw: string): string | null {
  const plate = raw.trim().toUpperCase()
  if (!plate) return "Plate text is required."
  if (!/^[A-Z0-9]+$/.test(plate)) {
    return "Only letters and numbers are allowed for Ohio personalized plates."
  }
  if (plate.length > 7) {
    return "Ohio personalized plates allow at most 7 characters."
  }
  return null
}

function classifyOhHtml(html: string): LiveCheckResult {
  const text = html.replace(/\s+/g, " ").trim()
  if (/currently available/i.test(text) || /alert-success/i.test(html)) {
    return {
      status: "available",
      message: "This plate number is currently available.",
    }
  }
  if (/plate is issued/i.test(text) || /not available|already issued/i.test(text)) {
    return { status: "taken", message: "Plate is issued." }
  }
  if (/alert-danger/i.test(html) || /not allowed|invalid|error/i.test(text)) {
    return {
      status: "not-allowed",
      message: text.slice(0, 240) || "Configuration was rejected by Ohio BMV.",
    }
  }
  return {
    status: "error",
    message: `Unrecognized Ohio BMV result: ${text.slice(0, 160) || "(empty)"}`,
  }
}

async function runOhFlow(plate: string): Promise<LiveCheckResult> {
  let browser: Browser | undefined
  try {
    browser = await launchStealthBrowser()
    const { page } = await prepareStealthPage(browser)

    await page.goto(START_URL, {
      waitUntil: "domcontentloaded",
      timeout: 12_000,
    })
    await page.getByText("Passenger", { exact: true }).first().click()
    await page.waitForSelector("#PersonalizedPlateNumber")
    await page.fill("#PersonalizedPlateNumber", plate)

    const previewPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/oplates/PlatePreview") && res.status() === 200,
      { timeout: 12_000 }
    )
    await page.getByRole("link", { name: /Check Availability/i }).click()
    const response = await previewPromise
    const html = await response.text()

    if (process.env.NODE_ENV === "development") {
      console.log("[oh-live] PlatePreview HTML:", html.slice(0, 500))
    }

    return classifyOhHtml(html)
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

export async function checkOhLiveAvailability(
  input: OhLiveCheckInput
): Promise<OhLiveCheckResult> {
  const plate = input.plate?.trim().toUpperCase() ?? ""
  const validationError = validateOhPlateText(plate)
  if (validationError) {
    return { status: "not-allowed", message: validationError }
  }

  try {
    return await withTimeout(runOhFlow(plate), LIVE_CHECK_TIMEOUT_MS, "OH plate check")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Ohio plate check failure."
    if (process.env.NODE_ENV === "development") {
      console.error("[oh-live] error:", message)
    }
    return { status: "error", message }
  }
}

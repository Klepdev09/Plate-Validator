/**
 * Unofficial integration against FLHSMV's public personalized plate form
 * (https://services.flhsmv.gov/MVCheckPersonalPlate/). This is not a documented
 * API — selectors and result wording may break if FLHSMV changes their page.
 *
 * Request contract (observed via Playwright / Network):
 * - Method: POST (ASP.NET WebForms full document postback to ./)
 * - Not AJAX — wait for navigation after Submit, then read DOM
 * - First config input: #MainContent_txtInputRowOne
 * - Submit: #MainContent_btnSubmit
 * - Status span: #MainContent_lblOutPutRowOne → "AVAILABLE" | "NOT AVAILABLE" | empty
 * - When available: #MainContent_btnEligiblePlateRowOne opens eligible plate type list
 */

import "server-only"

import type { Browser, Page } from "playwright-core"

import {
  LIVE_CHECK_TIMEOUT_MS,
  launchStealthBrowser,
  prepareStealthPage,
  withTimeout,
} from "@/lib/playwright-live"

export type FlLiveCheckStatus =
  | "available"
  | "taken"
  | "not-allowed"
  | "error"

export type FlLiveCheckResult = {
  status: FlLiveCheckStatus
  message?: string
  eligiblePlateTypes?: string[]
}

export type FlLiveCheckInput = {
  plate: string
}

const CHECKER_URL = "https://services.flhsmv.gov/MVCheckPersonalPlate/"

/** Center-design max: 7 characters (+ optional single space/hyphen). */
export function validateFlPlateText(raw: string): string | null {
  const plate = raw.trim().toUpperCase()
  if (!plate) return "Plate text is required."
  if (!/^[A-Z0-9 -]+$/.test(plate)) {
    return "Only letters, numbers, spaces, and hyphens are allowed."
  }
  const separators = (plate.match(/[ -]/g) ?? []).length
  if (separators > 1) {
    return "At most one space or hyphen is allowed."
  }
  const coreLength = plate.replace(/[ -]/g, "").length
  if (coreLength === 0) {
    return "Enter at least one letter or number."
  }
  if (coreLength > 7) {
    return "Florida center-design plates allow at most 7 characters."
  }
  return null
}

function classifyStatus(text: string): FlLiveCheckStatus | null {
  const normalized = text.replace(/\s+/g, " ").trim().toUpperCase()
  if (!normalized) return "not-allowed"
  if (normalized === "AVAILABLE") return "available"
  if (normalized === "NOT AVAILABLE") return "taken"
  if (/INVALID|NOT ALLOWED|NOT PERMITTED|OBJECTIONABLE|PROHIBITED/.test(normalized)) {
    return "not-allowed"
  }
  return null
}

async function readEligiblePlateTypes(page: Page): Promise<string[]> {
  const button = page.locator("#MainContent_btnEligiblePlateRowOne")
  if ((await button.count()) === 0) return []

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 12_000 }),
    button.click(),
  ])

  const types = await page.evaluate(() => {
    const body = document.body.innerText
    const start = body.indexOf("Eligible Plate Types")
    const end = body.indexOf("Return to Previous Page")
    if (start === -1) return [] as string[]
    const section = body.slice(start, end === -1 ? undefined : end)
    return section
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 1 &&
          !/Eligible Plate Types|scroll down|You may need/i.test(line) &&
          !/^\[?\d+\]?$/.test(line)
      )
  })

  if (process.env.NODE_ENV === "development") {
    console.log("[fl-live] eligible plate types:", types)
  }

  return types
}

async function runFlCheckFlow(
  page: Page,
  plate: string
): Promise<FlLiveCheckResult> {
  await page.goto(CHECKER_URL, {
    waitUntil: "domcontentloaded",
    timeout: 12_000,
  })

  await page.waitForSelector("#MainContent_txtInputRowOne")
  await page.fill("#MainContent_txtInputRowOne", plate)

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 12_000 }),
    page.click("#MainContent_btnSubmit"),
  ])

  await page.waitForSelector("#MainContent_lblOutPutRowOne", { timeout: 12_000 })
  const statusEl = page.locator("#MainContent_lblOutPutRowOne")
  const statusText = (await statusEl.innerText()).replace(/\s+/g, " ").trim()
  const statusHtml = await statusEl.evaluate((el) => el.outerHTML)

  if (process.env.NODE_ENV === "development") {
    console.log("[fl-live] status HTML:", statusHtml)
    console.log("[fl-live] status text:", statusText || "(empty)")
  }

  const status = classifyStatus(statusText)
  if (!status) {
    return {
      status: "error",
      message: `Unrecognized FLHSMV result: ${statusText || "(empty)"}`,
    }
  }

  if (status === "available") {
    try {
      const eligiblePlateTypes = await readEligiblePlateTypes(page)
      return {
        status,
        message: statusText || "AVAILABLE",
        eligiblePlateTypes:
          eligiblePlateTypes.length > 0 ? eligiblePlateTypes : undefined,
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[fl-live] eligible types failed:", error)
      }
      return { status, message: statusText || "AVAILABLE" }
    }
  }

  if (status === "taken") {
    return { status, message: statusText || "NOT AVAILABLE" }
  }

  return {
    status: "not-allowed",
    message: statusText || "Configuration was rejected by FLHSMV.",
  }
}

/**
 * Live FL personalized plate check via Playwright against the public FLHSMV form.
 * Never throws — always returns a normalized result object.
 */
export async function checkFlLiveAvailability(
  input: FlLiveCheckInput
): Promise<FlLiveCheckResult> {
  const plate = input.plate?.trim().toUpperCase() ?? ""
  const validationError = validateFlPlateText(plate)
  if (validationError) {
    return { status: "not-allowed", message: validationError }
  }

  let browser: Browser | undefined

  try {
    return await withTimeout(
      (async () => {
        browser = await launchStealthBrowser()
        const { page } = await prepareStealthPage(browser)
        return runFlCheckFlow(page, plate)
      })(),
      LIVE_CHECK_TIMEOUT_MS,
      "FL plate check"
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected FL plate check failure."
    if (process.env.NODE_ENV === "development") {
      console.error("[fl-live] error:", message)
    }
    return { status: "error", message }
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

/**
 * Unofficial integration against NH DMV's public Platecheck UI
 * (https://business.nh.gov/Platecheck/). This is not a documented API —
 * selectors and result wording may break if NH changes their page.
 */

import "server-only"

import type { Browser, Page } from "playwright-core"

import {
  LIVE_CHECK_TIMEOUT_MS,
  assertPageNotBlocked,
  launchStealthBrowser,
  prepareStealthPage,
  withTimeout,
} from "@/lib/playwright-live"

export type NhLiveCheckStatus =
  | "available"
  | "taken"
  | "not-allowed"
  | "error"

export type NhLiveCheckResult = {
  status: NhLiveCheckStatus
  message?: string
}

export type NhLiveCheckInput = {
  plate: string
  /** Vehicle / plate category on Step 1. Defaults to Passenger. */
  vehicleType?: string
  /** Plate type on Step 2. Defaults to Passenger. */
  plateType?: string
}

const PLATECHECK_URL = "https://business.nh.gov/Platecheck/"

function classifyStatusText(
  className: string,
  text: string
): NhLiveCheckStatus | null {
  const normalizedClass = className.toLowerCase()
  const normalizedText = text.toLowerCase()

  if (
    normalizedClass.includes("not-allowed") ||
    /not allowed|not permitted|invalid|cannot be issued|prohibited|rejected/i.test(
      normalizedText
    )
  ) {
    return "not-allowed"
  }

  if (
    normalizedClass.includes("not-available") ||
    /not available|unavailable|already (in )?use|taken/i.test(normalizedText)
  ) {
    return "taken"
  }

  if (
    normalizedClass.includes("available") ||
    /status:\s*available|selection is available|is available/i.test(
      normalizedText
    )
  ) {
    return "available"
  }

  return null
}

async function readResult(page: Page): Promise<NhLiveCheckResult> {
  await page.waitForSelector(".status-indicator", { timeout: 12_000 })

  const indicator = page.locator(".status-indicator").first()
  const className = (await indicator.getAttribute("class")) ?? ""
  const text = (await indicator.innerText()).replace(/\s+/g, " ").trim()
  const resultHtml = await indicator.evaluate((el) => el.outerHTML)

  if (process.env.NODE_ENV === "development") {
    console.log("[nh-live] status indicator HTML:", resultHtml)
    console.log("[nh-live] status indicator text:", text)
  }

  const status = classifyStatusText(className, text)
  if (!status) {
    return {
      status: "error",
      message: `Unrecognized Platecheck result: ${text || "(empty)"}`,
    }
  }

  return { status, message: text }
}

async function runPlatecheckFlow(
  page: Page,
  input: Required<NhLiveCheckInput>
): Promise<NhLiveCheckResult> {
  await page.goto(PLATECHECK_URL, {
    waitUntil: "domcontentloaded",
    timeout: 12_000,
  })
  await assertPageNotBlocked(page, "NH Platecheck")

  // Home → wizard
  await page.getByRole("button", { name: "Next" }).first().click()
  await page.waitForSelector("#step1Select")

  // Step 1: vehicle / category
  await page.locator("#step1Select").selectOption({ label: input.vehicleType })
  await page.getByRole("button", { name: "Next" }).click()

  // Step 2 appears only after category is chosen + Next
  await page.waitForSelector("#step2Select")
  await page.locator("#step2Select").selectOption({ label: input.plateType })
  await page.getByRole("button", { name: "Next" }).click()

  // Step 3: plate text
  await page.waitForSelector("#plateNumber")
  await page.locator("#plateNumber").fill(input.plate)
  await page.getByRole("button", { name: /Check Plate Availability/i }).click()

  return readResult(page)
}

/**
 * Live NH vanity plate check via Playwright against the official Platecheck UI.
 * Never throws — always returns a normalized result object.
 */
export async function checkNhLiveAvailability(
  input: NhLiveCheckInput
): Promise<NhLiveCheckResult> {
  const plate = input.plate?.trim()
  if (!plate) {
    return { status: "error", message: "Plate text is required." }
  }

  const options: Required<NhLiveCheckInput> = {
    plate,
    vehicleType: input.vehicleType?.trim() || "Passenger",
    plateType: input.plateType?.trim() || "Passenger",
  }

  let browser: Browser | undefined

  try {
    return await withTimeout(
      (async () => {
        browser = await launchStealthBrowser()
        const { page } = await prepareStealthPage(browser)
        return runPlatecheckFlow(page, options)
      })(),
      LIVE_CHECK_TIMEOUT_MS,
      "NH Platecheck"
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Platecheck failure."
    if (process.env.NODE_ENV === "development") {
      console.error("[nh-live] error:", message)
    }
    return { status: "error", message }
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

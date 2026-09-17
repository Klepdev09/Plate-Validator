/**
 * Unofficial integration against NH DMV's public Platecheck UI
 * (https://business.nh.gov/Platecheck/). This is not a documented API —
 * selectors and result wording may break if NH changes their page.
 */

import "server-only"

import { chromium, type Browser, type Page } from "playwright"

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
const OVERALL_TIMEOUT_MS = 15_000
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`NH Platecheck timed out after ${ms}ms`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

async function launchBrowser(): Promise<Browser> {
  const common = {
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  }

  try {
    // Bundled Chromium is blocked by Akamai (403). Prefer installed Chrome.
    return await chromium.launch({ ...common, channel: "chrome" })
  } catch {
    return await chromium.launch(common)
  }
}

async function preparePage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  return page
}

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
        browser = await launchBrowser()
        const page = await preparePage(browser)
        return runPlatecheckFlow(page, options)
      })(),
      OVERALL_TIMEOUT_MS
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

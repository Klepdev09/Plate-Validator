import "server-only"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"

export const LIVE_CHECK_TIMEOUT_MS = 15_000
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export type LiveCheckStatus =
  | "available"
  | "taken"
  | "not-allowed"
  | "error"

export type LiveCheckResult = {
  status: LiveCheckStatus
  message?: string
  eligiblePlateTypes?: string[]
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
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

export async function launchStealthBrowser(): Promise<Browser> {
  const common = {
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  }

  try {
    return await chromium.launch({ ...common, channel: "chrome" })
  } catch {
    return await chromium.launch(common)
  }
}

export async function prepareStealthPage(browser: Browser): Promise<{
  context: BrowserContext
  page: Page
}> {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-US",
    viewport: { width: 1400, height: 900 },
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  return { context, page }
}

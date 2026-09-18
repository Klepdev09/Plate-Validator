import "server-only"

import {
  chromium as playwrightChromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright-core"

export const LIVE_CHECK_TIMEOUT_MS = process.env.VERCEL ? 25_000 : 15_000
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

/** Matches @sparticuz/chromium-min; Vercel x64 downloads this pack on cold start. */
const DEFAULT_CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.x64.tar"

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

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
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

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV
  )
}

function remoteBrowserEndpoint(): string | undefined {
  const direct = process.env.PLAYWRIGHT_WS_ENDPOINT?.trim()
  if (direct) return direct

  const token = process.env.BROWSERLESS_TOKEN?.trim()
  if (token) {
    // Playwright protocol endpoint (not raw CDP).
    return `wss://production-sfo.browserless.io/chrome/playwright?token=${token}`
  }

  return undefined
}

/**
 * Launch Chromium for live DMV checks.
 * - Optional: PLAYWRIGHT_WS_ENDPOINT or BROWSERLESS_TOKEN (recommended for Akamai-protected sites on Vercel)
 * - Local: prefer system Chrome (Akamai often blocks stock Chromium)
 * - Vercel/Lambda fallback: @sparticuz/chromium-min + remote pack
 */
export async function launchStealthBrowser(): Promise<Browser> {
  const wsEndpoint = remoteBrowserEndpoint()
  if (wsEndpoint) {
    // Browserless Playwright URLs use connect(); CDP URLs use connectOverCDP.
    if (/playwright/i.test(wsEndpoint)) {
      return playwrightChromium.connect(wsEndpoint)
    }
    return playwrightChromium.connectOverCDP(wsEndpoint)
  }

  const stealthArgs = ["--disable-blink-features=AutomationControlled"]

  if (isServerlessRuntime()) {
    const { default: chromium } = await import("@sparticuz/chromium-min")
    const packUrl =
      process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim() || DEFAULT_CHROMIUM_PACK_URL

    return playwrightChromium.launch({
      args: [...chromium.args, ...stealthArgs],
      executablePath: await chromium.executablePath(packUrl),
      headless: true,
    })
  }

  const common = {
    headless: true,
    args: stealthArgs,
  }

  try {
    // Bundled Chromium is blocked by Akamai (403) on some DMV sites.
    return await playwrightChromium.launch({ ...common, channel: "chrome" })
  } catch {
    return playwrightChromium.launch(common)
  }
}

export async function prepareStealthPage(browser: Browser): Promise<{
  context: BrowserContext
  page: Page
}> {
  // connectOverCDP may already have a default context.
  const existing = browser.contexts()[0]
  const context =
    existing ??
    (await browser.newContext({
      userAgent: USER_AGENT,
      locale: "en-US",
      viewport: { width: 1400, height: 900 },
    }))

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    })
  })

  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  return { context, page }
}

/** Detect Akamai / WAF interstitial pages that block automation. */
export async function assertPageNotBlocked(
  page: Page,
  label: string
): Promise<void> {
  const title = await page.title().catch(() => "")
  const bodyText = await page.locator("body").innerText().catch(() => "")
  const haystack = `${title}\n${bodyText}`.toLowerCase()

  if (
    /access denied|errors\.edgesuite\.net|reference\s*#\d+|request blocked|bot detected|attention required/i.test(
      haystack
    )
  ) {
    throw new Error(
      `${label} blocked automated access (Akamai/WAF). On Vercel, set PLAYWRIGHT_WS_ENDPOINT or BROWSERLESS_TOKEN to a remote Chrome service.`
    )
  }
}

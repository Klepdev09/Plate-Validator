import { NextResponse } from "next/server"

import { checkFlLiveAvailability } from "@/lib/check-fl-live"
import {
  allowRequest,
  cacheKey,
  clientIpFromRequest,
  getCachedResult,
  setCachedResult,
} from "@/lib/live-check-guard"
import type { FlLiveCheckResult } from "@/lib/check-fl-live"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request)
    if (!allowRequest(ip)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Too many requests. Please wait a minute and try again.",
        },
        { status: 429 }
      )
    }

    const body = (await request.json()) as { plate?: string }

    if (!body.plate || typeof body.plate !== "string") {
      return NextResponse.json(
        { status: "error", message: "plate is required" },
        { status: 400 }
      )
    }

    const key = cacheKey("fl", body.plate)
    const cached = getCachedResult<FlLiveCheckResult>(key)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    const result = await checkFlLiveAvailability({ plate: body.plate })
    if (result.status !== "error") {
      setCachedResult(key, result)
    }

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error."
    return NextResponse.json({ status: "error", message }, { status: 500 })
  }
}

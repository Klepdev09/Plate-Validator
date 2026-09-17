import { NextResponse } from "next/server"

import { checkNhLiveAvailability } from "@/lib/check-nh-live"
import type { NhLiveCheckResult } from "@/lib/check-nh-live"
import {
  allowRequest,
  cacheKey,
  clientIpFromRequest,
  getCachedResult,
  setCachedResult,
} from "@/lib/live-check-guard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** Playwright needs more than the default serverless window. */
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

    const body = (await request.json()) as {
      plate?: string
      vehicleType?: string
      plateType?: string
    }

    if (!body.plate || typeof body.plate !== "string") {
      return NextResponse.json(
        { status: "error", message: "plate is required" },
        { status: 400 }
      )
    }

    const key = cacheKey(
      "nh",
      body.plate,
      `${body.vehicleType ?? "Passenger"}:${body.plateType ?? "Passenger"}`
    )
    const cached = getCachedResult<NhLiveCheckResult>(key)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    const result = await checkNhLiveAvailability({
      plate: body.plate,
      vehicleType: body.vehicleType,
      plateType: body.plateType,
    })

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

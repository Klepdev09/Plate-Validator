"use client"

import {
  CheckCircle2Icon,
  Loader2Icon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react"
import { useState } from "react"

import { PlatePreview } from "@/components/plate-preview"
import { SiteHeader } from "@/components/site-header"
import { USMap } from "@/components/us-map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  allowedPlatePattern,
  checkPlate,
  type PlateValidationResult,
} from "@/lib/plate-validation"
import { recordRecentCheck } from "@/lib/recent-checks"
import { getStatePlateRule, liveCheckStates } from "@/lib/state-plate-rules"
import { getStateByFips, US_STATES } from "@/lib/states"
import { cn } from "@/lib/utils"

const LIVE_CHECK_STATES = liveCheckStates()

type LiveStatus = "available" | "taken" | "not-allowed" | "error"

type CheckResult = PlateValidationResult & {
  liveStatus?: LiveStatus
  eligiblePlateTypes?: string[]
}

/** How the current state was chosen — quick-select hides the dropdown. */
type StatePickerSource = "dropdown" | "quick"

export default function HomePage() {
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [statePickerSource, setStatePickerSource] =
    useState<StatePickerSource>("dropdown")
  const [plateText, setPlateText] = useState("")
  const [result, setResult] = useState<CheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const canSubmit =
    Boolean(selectedState) && plateText.trim().length > 0 && !isChecking
  const selectedStateName = getStateByFips(selectedState)?.name ?? ""
  const showPlatePreview =
    Boolean(selectedState) && plateText.trim().length > 0
  const hideStateDropdown = statePickerSource === "quick" && Boolean(selectedState)

  function applyStateSelection(
    value: string | null,
    source: StatePickerSource
  ) {
    setSelectedState(value)
    setStatePickerSource(source)
    setResult(null)
    if (value) {
      setPlateText((current) =>
        current.toUpperCase().replace(allowedPlatePattern(value), "")
      )
    }
  }

  function handleStateChange(value: string | null) {
    applyStateSelection(value, "dropdown")
  }

  function handleQuickSelect(fips: string) {
    applyStateSelection(fips, "quick")
  }

  function handleChooseDifferentState() {
    applyStateSelection(null, "dropdown")
  }

  function handlePlateChange(value: string) {
    setPlateText(
      value.toUpperCase().replace(allowedPlatePattern(selectedState), "")
    )
    setResult(null)
  }

  async function handleCheckAvailability() {
    const formatResult = checkPlate(selectedState, plateText)
    setPlateText(formatResult.normalized)

    const liveRule = getStatePlateRule(selectedState)
    const canLiveCheck =
      formatResult.ok &&
      liveRule?.mode === "live" &&
      Boolean(liveRule.endpoint)

    if (!canLiveCheck || !liveRule?.endpoint) {
      setResult(formatResult)
      recordRecentCheck({
        stateName: formatResult.state.name,
        plate: formatResult.normalized,
        resultType: formatResult.ok ? "valid-format" : "invalid-format",
      })
      return
    }

    setIsChecking(true)
    setResult({
      ...formatResult,
      messages: [
        `Checking ${liveRule.name} availability for “${formatResult.normalized}”…`,
      ],
    })

    try {
      const response = await fetch(liveRule.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          liveRule.fips === "33"
            ? {
                plate: formatResult.normalized,
                vehicleType: "Passenger",
                plateType: "Passenger",
              }
            : { plate: formatResult.normalized }
        ),
      })
      const live = (await response.json()) as {
        status: LiveStatus
        message?: string
        eligiblePlateTypes?: string[]
      }

      const messagesByStatus: Record<LiveStatus, string[]> = {
        available: [
          `“${formatResult.normalized}” is available in ${liveRule.name}.`,
          ...(live.eligiblePlateTypes?.length
            ? [
                `Eligible plate types: ${live.eligiblePlateTypes
                  .slice(0, 8)
                  .join(", ")}${
                  live.eligiblePlateTypes.length > 8
                    ? ` (+${live.eligiblePlateTypes.length - 8} more)`
                    : ""
                }.`,
              ]
            : []),
        ],
        taken: [
          `“${formatResult.normalized}” is not available in ${liveRule.name}.`,
        ],
        "not-allowed": [
          live.message ||
            `“${formatResult.normalized}” is not allowed by ${liveRule.name}.`,
        ],
        error: [
          live.message ||
            "Live availability check failed. Try again in a moment.",
        ],
      }

      const liveStatus: LiveStatus =
        live.status === "available" ||
        live.status === "taken" ||
        live.status === "not-allowed" ||
        live.status === "error"
          ? live.status
          : "error"

      setResult({
        ...formatResult,
        ok: liveStatus === "available",
        liveStatus,
        eligiblePlateTypes: live.eligiblePlateTypes,
        messages: messagesByStatus[liveStatus],
      })
      recordRecentCheck({
        stateName: liveRule.name,
        plate: formatResult.normalized,
        resultType: liveStatus,
      })
    } catch {
      setResult({
        ...formatResult,
        ok: false,
        liveStatus: "error",
        messages: ["Live availability check failed. Try again in a moment."],
      })
      recordRecentCheck({
        stateName: liveRule.name,
        plate: formatResult.normalized,
        resultType: "error",
      })
    } finally {
      setIsChecking(false)
    }
  }

  function resultTitle(current: CheckResult): string {
    if (current.liveStatus === "available") return "Available"
    if (current.liveStatus === "taken") return "Not available"
    if (current.liveStatus === "not-allowed") return "Not allowed"
    if (current.liveStatus === "error") return "Check failed"
    if (current.ok) return "Format check passed"
    return "Invalid plate"
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-stretch lg:gap-8 lg:px-8 lg:py-8">
        <section className="flex w-full flex-col justify-center lg:w-[40%] lg:pr-4">
          <div className="mx-auto w-full max-w-md space-y-10 lg:mx-0">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Find your plate
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Pick a state below for a live check, or search any state for a
                quick format check
              </p>
            </div>

            <div className="space-y-4">
              {LIVE_CHECK_STATES.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Live check available for:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LIVE_CHECK_STATES.map((state) => {
                      const isActive = selectedState === state.fips
                      return (
                        <button
                          key={state.fips}
                          type="button"
                          onClick={() => handleQuickSelect(state.fips)}
                          aria-pressed={isActive}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border border-l-[3px] border-l-accent bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-colors hover:bg-muted/60",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            isActive &&
                              "border-accent/40 border-l-accent bg-secondary text-secondary-foreground ring-1 ring-accent/30"
                          )}
                        >
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full bg-accent"
                          />
                          {state.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {!hideStateDropdown ? (
                <Select
                  value={selectedState}
                  onValueChange={handleStateChange}
                  items={US_STATES.map((state) => ({
                    value: state.fips,
                    label: state.name,
                  }))}
                >
                  <SelectTrigger className="w-full rounded-[var(--radius)] bg-card">
                    <SelectValue placeholder="Choose a state" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start">
                    {US_STATES.map((state) => (
                      <SelectItem key={state.fips} value={state.fips}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <div className="space-y-2">
                <div className="relative">
                  <SearchIcon
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={plateText}
                    onValueChange={handlePlateChange}
                    placeholder="Type the plate you want"
                    className="h-10 rounded-[var(--radius)] bg-card pl-9 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="characters"
                    aria-invalid={result ? !result.ok : undefined}
                    disabled={isChecking}
                  />
                </div>
                {hideStateDropdown ? (
                  <button
                    type="button"
                    onClick={handleChooseDifferentState}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Choose a different state
                  </button>
                ) : null}
              </div>

              <Button
                type="button"
                size="lg"
                className="h-10 w-full rounded-[var(--radius)]"
                disabled={!canSubmit}
                onClick={handleCheckAvailability}
              >
                {isChecking ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Check availability"
                )}
              </Button>

              {result ? (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-[var(--radius)] border px-4 py-3 text-sm ${
                    result.ok
                      ? "border-accent/40 bg-secondary text-secondary-foreground"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isChecking ? (
                      <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : result.ok ? (
                      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-accent" />
                    ) : (
                      <XCircleIcon className="mt-0.5 size-4 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium">{resultTitle(result)}</p>
                      <ul className="space-y-1 text-sm opacity-90">
                        {result.messages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              {showPlatePreview ? (
                <PlatePreview
                  state={selectedStateName}
                  plateText={plateText}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="flex min-h-[320px] w-full flex-1 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted p-4 sm:min-h-[420px] lg:w-[60%] lg:min-h-0 lg:p-6">
          <div className="h-full max-h-[560px] w-full">
            <USMap selectedStateFips={selectedState} />
          </div>
        </section>
      </main>
    </div>
  )
}

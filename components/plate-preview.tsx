"use client"

import { cn } from "@/lib/utils"

export type PlatePreviewProps = {
  state: string
  plateText: string
  className?: string
}

export function PlatePreview({ state, plateText, className }: PlatePreviewProps) {
  const displayPlate = plateText.trim().toUpperCase()
  const displayState = state.trim().toUpperCase()

  if (!displayPlate || !displayState) {
    return null
  }

  return (
    <div
      className={cn(
        "mx-auto mt-6 w-full max-w-[300px] animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
      aria-hidden
    >
      <div
        className="relative aspect-[2/1] overflow-hidden rounded-xl border-2 border-accent/70 bg-card shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
        style={{ borderRadius: "var(--radius)" }}
      >
        {/* Decorative bolts */}
        <span
          aria-hidden
          className="absolute top-3 left-3 size-2.5 rounded-full bg-muted-foreground/25 ring-1 ring-muted-foreground/15"
        />
        <span
          aria-hidden
          className="absolute top-3 right-3 size-2.5 rounded-full bg-muted-foreground/25 ring-1 ring-muted-foreground/15"
        />

        <div className="flex h-full flex-col items-center justify-center gap-1 px-4 pb-2 pt-3">
          <p className="text-[0.65rem] font-medium tracking-[0.28em] text-muted-foreground uppercase">
            {displayState}
          </p>
          <p className="max-w-full truncate font-mono text-2xl font-bold tracking-[0.18em] text-foreground transition-all duration-150 ease-out sm:text-3xl">
            {displayPlate}
          </p>
        </div>
      </div>
    </div>
  )
}

import {
  AlertTriangleIcon,
  BanIcon,
  CheckIcon,
  CircleDotIcon,
  CircleOffIcon,
  HelpCircleIcon,
  XIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { RecentCheckResultType } from "@/lib/recent-checks"
import { cn } from "@/lib/utils"

const RESULT_BADGES: Record<
  RecentCheckResultType | "unknown",
  { label: string; className: string; Icon: LucideIcon }
> = {
  available: {
    label: "Available",
    className: "bg-accent/15 text-accent",
    Icon: CheckIcon,
  },
  taken: {
    label: "Taken",
    className: "bg-destructive/10 text-destructive",
    Icon: XIcon,
  },
  "not-allowed": {
    label: "Not allowed",
    className:
      "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    Icon: BanIcon,
  },
  "valid-format": {
    label: "Format valid",
    className: "bg-muted text-muted-foreground",
    Icon: CircleDotIcon,
  },
  "invalid-format": {
    label: "Format invalid",
    className: "bg-muted text-muted-foreground",
    Icon: AlertTriangleIcon,
  },
  error: {
    label: "Couldn't check",
    className: "bg-muted text-muted-foreground",
    Icon: CircleOffIcon,
  },
  unknown: {
    label: "Format checked",
    className: "bg-muted text-muted-foreground",
    Icon: HelpCircleIcon,
  },
}

export function CheckResultBadge({
  resultType,
}: {
  resultType?: RecentCheckResultType
}) {
  const badge = RESULT_BADGES[resultType ?? "unknown"]
  const Icon = badge.Icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        badge.className
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {badge.label}
    </span>
  )
}

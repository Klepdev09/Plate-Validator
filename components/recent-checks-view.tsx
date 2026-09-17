"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { CheckResultBadge } from "@/components/check-result-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRelativeTime } from "@/lib/format-relative-time"
import {
  clearRecentChecks,
  getRecentChecks,
  type RecentCheck,
} from "@/lib/recent-checks"

export function RecentChecksView() {
  const [checks, setChecks] = useState<RecentCheck[] | null>(null)

  useEffect(() => {
    setChecks(getRecentChecks())
  }, [])

  function handleClearHistory() {
    clearRecentChecks()
    setChecks([])
  }

  if (checks === null) {
    return <div className="flex-1" aria-hidden />
  }

  if (checks.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <h2 className="mt-12 text-center text-xl font-semibold tracking-tight text-foreground sm:mt-16 sm:text-2xl">
          Recent checks
        </h2>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="max-w-md text-base text-muted-foreground">
            No checks yet — try searching a plate on the Home page
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative mt-12 space-y-2 text-center sm:mt-16">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Recent checks
        </h2>
        <p className="text-base text-muted-foreground sm:text-lg">
          Stored on this device only.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="absolute top-0 right-0 text-muted-foreground hover:text-destructive"
        >
          Clear history
        </Button>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">State</TableHead>
              <TableHead className="px-4">Plate</TableHead>
              <TableHead className="px-4">Result</TableHead>
              <TableHead className="px-4">Checked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((check) => (
              <TableRow key={check.id}>
                <TableCell className="px-4 py-3 font-medium text-foreground">
                  {check.stateName}
                </TableCell>
                <TableCell className="px-4 py-3 font-mono text-foreground">
                  {check.plate}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <CheckResultBadge resultType={check.resultType} />
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  <time dateTime={check.checkedAt} title={check.checkedAt}>
                    {formatRelativeTime(check.checkedAt)}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

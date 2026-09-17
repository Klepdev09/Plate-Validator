import type { Metadata } from "next"

import { RecentChecksView } from "@/components/recent-checks-view"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Recent checks — PlatePing",
  description: "Past vanity plate checks stored on this device.",
}

export default function RecentChecksPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <RecentChecksView />
      </main>
    </div>
  )
}

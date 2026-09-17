import type { Metadata } from "next"

import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "How it works — PlatePing",
  description:
    "How PlatePing checks vanity plate availability: live DMV checks for some states, format checks for the rest.",
}

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <article className="max-w-2xl space-y-10">
          <header className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              How it works
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              PlatePing checks whether a vanity plate idea can work in a given
              state. Depending on the state, that is either a live availability
              check against the DMV, or a format check against known plate
              rules.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Live availability
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              For New Hampshire, Florida, Ohio, and Pennsylvania, PlatePing
              checks the state’s own public availability tool in real time. The
              result is whatever that DMV tool reports at that moment —
              available, taken, or not allowed — not a guess or a cached list.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Format checking
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              For every other state, PlatePing only checks the plate against
              that state’s known character rules: length limits and which
              letters or numbers are allowed. It does not know whether the plate
              is already taken. A passing format check means the idea is validly
              formed, not that it is free.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Why not every state?
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Most states do not offer a public online availability tool, and
              there is no official nationwide API for vanity plate checks.
              PlatePing only does live checks for states that publish a genuine
              DMV tool that can be queried programmatically. Everywhere else,
              format checking is the honest limit of what we can do.
            </p>
          </section>

          <aside
            className="rounded-[var(--radius)] border border-border border-l-[3px] border-l-accent bg-muted px-4 py-4 sm:px-5 sm:py-5"
            aria-labelledby="disclaimer-heading"
          >
            <h2
              id="disclaimer-heading"
              className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Disclaimer
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Results are informational only. Checking a plate here does not
              reserve it. Availability can change between the moment you check
              and the moment you apply. Always confirm with your state’s DMV
              before you submit a formal application.
            </p>
          </aside>
        </article>
      </main>
    </div>
  )
}

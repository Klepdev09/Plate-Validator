import { PlatePingWordmark } from "@/components/plateping-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimatedTabs } from "@/components/ui/animated-tabs"

const NAV_TABS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Recent checks", href: "/recent-checks" },
]

export function SiteHeader() {
  return (
    <header className="bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <PlatePingWordmark />
        <nav>
          <AnimatedTabs tabs={NAV_TABS} />
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}

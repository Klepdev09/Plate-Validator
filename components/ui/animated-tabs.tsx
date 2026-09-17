"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react"

export type AnimatedTab = {
  label: string
  href?: string
}

export interface AnimatedTabsProps {
  tabs: AnimatedTab[]
}

function labelForPath(pathname: string, tabs: AnimatedTab[]) {
  return tabs.find((tab) => tab.href && tab.href === pathname)?.label
}

export function AnimatedTabs({ tabs }: AnimatedTabsProps) {
  const pathname = usePathname()
  const pathLabel = labelForPath(pathname, tabs)
  const [activeTab, setActiveTab] = useState(pathLabel ?? tabs[0].label)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(
    null
  )

  useEffect(() => {
    if (pathLabel) setActiveTab(pathLabel)
  }, [pathLabel])

  useLayoutEffect(() => {
    const container = containerRef.current

    if (container && activeTab) {
      const activeTabElement = activeTabRef.current

      if (activeTabElement) {
        const { offsetLeft, offsetWidth } = activeTabElement

        const clipLeft = offsetLeft + 16
        const clipRight = offsetLeft + offsetWidth + 16

        container.style.clipPath = `inset(0 ${Number(
          100 - (clipRight / container.offsetWidth) * 100
        ).toFixed()}% 0 ${Number(
          (clipLeft / container.offsetWidth) * 100
        ).toFixed()}% round 17px)`
      }
    }
  }, [activeTab])

  return (
    <div className="relative mx-auto flex w-fit flex-col items-center rounded-full border border-primary/10 bg-secondary/50 px-4 py-2">
      <div
        ref={containerRef}
        className="pointer-events-none absolute z-10 w-full overflow-hidden [clip-path:inset(0px_75%_0px_0%_round_17px)] [transition:clip-path_0.25s_ease]"
      >
        <div className="relative flex w-full justify-center bg-primary">
          {tabs.map((tab, index) => (
            <TabControl
              key={index}
              tab={tab}
              className="flex h-8 items-center rounded-full p-3 text-sm font-medium text-primary-foreground"
              tabIndex={-1}
              ariaHidden
              onSelect={() => setActiveTab(tab.label)}
            />
          ))}
        </div>
      </div>

      <div className="relative flex w-full justify-center">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.label

          return (
            <TabControl
              key={index}
              tab={tab}
              isActive={isActive}
              className="flex h-8 cursor-pointer items-center rounded-full p-3 text-sm font-medium text-muted-foreground"
              onSelect={() => setActiveTab(tab.label)}
              controlRef={isActive ? activeTabRef : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

function TabControl({
  tab,
  className,
  isActive = false,
  tabIndex,
  ariaHidden = false,
  onSelect,
  controlRef,
}: {
  tab: AnimatedTab
  className: string
  isActive?: boolean
  tabIndex?: number
  ariaHidden?: boolean
  onSelect: () => void
  controlRef?: Ref<HTMLAnchorElement | HTMLButtonElement>
}) {
  if (tab.href) {
    return (
      <Link
        href={tab.href}
        ref={controlRef as Ref<HTMLAnchorElement>}
        onClick={onSelect}
        className={className}
        tabIndex={tabIndex}
        aria-hidden={ariaHidden || undefined}
        aria-current={isActive && !ariaHidden ? "page" : undefined}
      >
        {tab.label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      ref={controlRef as Ref<HTMLButtonElement>}
      onClick={onSelect}
      className={className}
      tabIndex={tabIndex}
      aria-hidden={ariaHidden || undefined}
      aria-pressed={isActive && !ariaHidden ? true : undefined}
    >
      {tab.label}
    </button>
  )
}

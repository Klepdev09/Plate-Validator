import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandProps = {
  className?: string
}

export function PlatePingWordmark({ className }: BrandProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="PlatePing home"
    >
      <Image
        src="/brand/plateping-wordmark.png"
        alt="PlatePing"
        width={220}
        height={44}
        className="h-8 w-auto sm:h-9"
        priority
      />
    </Link>
  )
}

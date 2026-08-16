"use client"

import Link from "next/link"
import { Infinity as InfinityIcon, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"

export function UsageIndicator({
  planName,
  used,
  limit,
  unlimited,
  lifetime = false,
}: {
  planName: string
  used: number
  limit: number | null
  unlimited: boolean
  /** When true, the allowance is a lifetime total (no monthly reset). */
  lifetime?: boolean
}) {
  const atLimit = !unlimited && limit !== null && used >= limit
  const nearLimit = !unlimited && limit !== null && used >= limit * 0.8

  if (unlimited) {
    return (
      <Link
        href="/billing"
        className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
      >
        <InfinityIcon className="size-3.5 text-primary" />
        {planName}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        atLimit
          ? openUpgradeDialog(
              lifetime
                ? "You've used all your free notes. Upgrade to a plan or grab an Event Pass to keep sending."
                : "You've used all your notes this period. Upgrade to keep sending.",
            )
          : (window.location.href = "/billing")
      }
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex",
        atLimit
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
          : nearLimit
            ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
            : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <Zap className={cn("size-3.5", atLimit ? "text-destructive" : "text-primary")} />
      {used} / {limit}
      <span className="text-muted-foreground/70">notes</span>
    </button>
  )
}

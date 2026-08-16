import Link from "next/link"
import { Plus, Users, HelpCircle } from "lucide-react"
import { BrandLogo } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { UserMenu, type SessionUser } from "@/components/user-menu"
import { UsageIndicator } from "@/components/billing/usage-indicator"
import type { PlanId } from "@/lib/plans"

export type HeaderUsage = {
  planId: PlanId
  planName: string
  used: number
  limit: number | null
  unlimited: boolean
  /** Free allowance is a lifetime total (no monthly reset) when true. */
  lifetime: boolean
  /** Whether the user may print & mail cards/labels (paid plan or Event Pass). */
  canPrint: boolean
}

export function SiteHeader({
  showNewEvent = true,
  user,
  usage,
}: {
  showNewEvent?: boolean
  user?: SessionUser | null
  usage?: HeaderUsage | null
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogo />
        <div className="flex items-center gap-2">
          {usage ? (
            <UsageIndicator
              planName={usage.planName}
              used={usage.used}
              limit={usage.limit}
              unlimited={usage.unlimited}
              lifetime={usage.lifetime}
            />
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/how-to" />}
          >
            <HelpCircle data-icon="inline-start" />
            How to use
          </Button>
          {user ? (
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/contacts" />}
            >
              <Users data-icon="inline-start" />
              Contacts
            </Button>
          ) : null}
          {user && showNewEvent ? (
            <Button size="sm" nativeButton={false} render={<Link href="/events/new" />}>
              <Plus data-icon="inline-start" />
              New event
            </Button>
          ) : null}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Sign in
              </Button>
              <Button size="sm" nativeButton={false} render={<Link href="/sign-up" />}>
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

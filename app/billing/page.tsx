import { redirect } from "next/navigation"
import { Suspense } from "react"

import { SiteHeader } from "@/components/site-header"
import { BillingPanel } from "@/components/billing/billing-panel"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { getActivePass, getSubscription, getUsage, hasAnyPass } from "@/lib/billing"
import { getPlan } from "@/lib/plans"

export const metadata = {
  title: "Billing & Plans | Thankful AI",
  description: "Manage your Thankful AI subscription, usage, and billing.",
}

export default async function BillingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const [sub, usage, headerUsage, activePass, everHadPass] = await Promise.all([
    getSubscription(session.user.id),
    getUsage(session.user.id),
    getHeaderUsage(),
    getActivePass(session.user.id),
    hasAnyPass(session.user.id),
  ])
  const plan = getPlan(sub.plan)

  const summary = {
    planId: plan.id,
    status: sub.status ?? "free",
    used: usage.used,
    limit: usage.limit,
    unlimited: usage.limit === null,
    currentPeriodEnd: sub.current_period_end
      ? new Date(sub.current_period_end).toISOString()
      : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    hasCustomer: !!sub.stripe_customer_id,
    // Event Pass surface: whether usage is pass-backed, remaining credits, and
    // whether the one-time offer should still be shown (free plan, no pass yet).
    fromPass: usage.fromPass,
    passRemaining: activePass?.remaining ?? null,
    canBuyPass: plan.id === "free" && !everHadPass,
    lifetime: usage.lifetime,
  }

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} usage={headerUsage} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="font-serif text-4xl text-foreground text-balance">
            Billing &amp; plans
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-pretty">
            Track your usage, change plans, and manage payment details.
          </p>
        </header>
        <Suspense>
          <BillingPanel summary={summary} />
        </Suspense>
      </main>
    </div>
  )
}

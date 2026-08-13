"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles, Ticket } from "lucide-react"

import { EVENT_PASS, PLANS, formatPrice, type PlanId } from "@/lib/plans"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/** Per-plan call-to-action label, per the pricing spec. */
const PLAN_CTA: Record<PlanId, string> = {
  free: "Start Free",
  starter: "Upgrade",
  family: "Choose Family",
  pro: "Go Pro",
}

/**
 * Public pricing page. Renders the four monthly-subscription plans plus the
 * one-time Event Pass, visually separated so a one-event buyer and a recurring
 * subscriber can each find their product at a glance. Selecting a paid plan or
 * the pass routes guests through sign-in and authed users straight to billing,
 * where the matching embedded checkout opens.
 */
export function PricingGrid({
  isAuthed,
  currentPlan,
}: {
  isAuthed: boolean
  currentPlan: PlanId | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  function go(dest: string, key: string) {
    setPending(key)
    if (!isAuthed) {
      router.push(`/sign-in?next=${encodeURIComponent(dest)}`)
      return
    }
    router.push(dest)
  }

  function handleSelect(planId: PlanId) {
    if (planId === "free") {
      go(isAuthed ? "/dashboard" : "/sign-up", "free")
      return
    }
    go(`/billing?plan=${planId}`, planId)
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Monthly subscriptions */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Monthly Subscription
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isFree = plan.id === "free"
            const isPending = pending === plan.id

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col gap-5 rounded-2xl border bg-card p-6",
                  plan.popular &&
                    "border-primary shadow-sm ring-1 ring-primary/20",
                )}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    <Sparkles className="size-3" />
                    Most Popular
                  </span>
                ) : null}

                <div className="flex flex-col gap-1">
                  <h3 className="font-serif text-xl font-semibold">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {plan.tagline}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-4xl font-semibold">
                    {formatPrice(plan.priceInCents)}
                  </span>
                  {!isFree ? (
                    <span className="text-sm text-muted-foreground">
                      /month
                    </span>
                  ) : null}
                </div>

                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-pretty">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent || isPending}
                  onClick={() => handleSelect(plan.id)}
                >
                  {isPending ? <Spinner data-icon="inline-start" /> : null}
                  {isCurrent ? "Current plan" : PLAN_CTA[plan.id]}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* One-time Event Pass */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            One-Time Purchase
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-accent bg-accent/10 p-6 ring-1 ring-accent/30 sm:p-8">
          <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Ticket className="size-3" />
            Best for Weddings
          </span>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-2xl font-semibold text-foreground">
                  {EVENT_PASS.name}
                </h3>
                <span className="rounded-full border border-accent/40 bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  One-Time Purchase
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {EVENT_PASS.tagline}
              </p>
              <p className="mt-3 text-sm text-muted-foreground text-pretty">
                {EVENT_PASS.blurb}
              </p>

              <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {EVENT_PASS.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                    <span className="text-pretty">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-4 lg:items-center lg:text-center">
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-5xl font-semibold text-foreground">
                  {formatPrice(EVENT_PASS.priceInCents)}
                </span>
                <span className="text-sm text-muted-foreground">one-time</span>
              </div>
              <Button
                size="lg"
                disabled={pending === "pass"}
                onClick={() => go("/billing?pass=1", "pass")}
              >
                {pending === "pass" ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Ticket data-icon="inline-start" />
                )}
                Buy Event Pass
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

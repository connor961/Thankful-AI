"use client"

import { Check, Sparkles } from "lucide-react"

import { PLANS, formatPrice, type PlanId } from "@/lib/plans"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function PlanCards({
  currentPlan,
  onSelect,
  pendingPlan,
  disabledReason,
}: {
  currentPlan?: PlanId
  onSelect: (planId: PlanId) => void
  pendingPlan?: PlanId | null
  disabledReason?: (planId: PlanId) => string | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => {
        const isCurrent = currentPlan === plan.id
        const isFree = plan.id === "free"
        const disabled = disabledReason?.(plan.id) ?? null
        const pending = pendingPlan === plan.id

        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col gap-5 rounded-2xl border bg-card p-6",
              plan.popular && "border-primary shadow-sm ring-1 ring-primary/20",
            )}
          >
            {plan.popular ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                <Sparkles className="size-3" />
                Most popular
              </span>
            ) : null}

            <div className="flex flex-col gap-1">
              <h3 className="font-serif text-xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-serif text-4xl font-semibold">
                {formatPrice(plan.priceInCents)}
              </span>
              {!isFree ? (
                <span className="text-sm text-muted-foreground">/month</span>
              ) : null}
            </div>

            <ul className="flex flex-1 flex-col gap-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-pretty">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? "default" : "outline"}
              disabled={isCurrent || isFree || !!disabled || pending}
              onClick={() => onSelect(plan.id)}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {isCurrent
                ? "Current plan"
                : isFree
                  ? "Free forever"
                  : disabled
                    ? disabled
                    : `Choose ${plan.name}`}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

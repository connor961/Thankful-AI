"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CreditCard, Loader2, Ticket, Check } from "lucide-react"
import { toast } from "sonner"

import {
  createCheckout,
  createEventPassCheckout,
  createPortalSession,
  reconcileCheckout,
  reconcileEventPass,
} from "@/app/actions/billing"
import { EVENT_PASS, formatPrice, getPlan, type PlanId } from "@/lib/plans"
import { Button } from "@/components/ui/button"
import { PlanCards } from "@/components/billing/plan-cards"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
)

export type BillingSummary = {
  planId: PlanId
  status: string
  used: number
  limit: number | null
  unlimited: boolean
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  fromPass: boolean
  passRemaining: number | null
  canBuyPass: boolean
  /** Free allowance is a lifetime total (no monthly reset) when true. */
  lifetime: boolean
}

export function BillingPanel({ summary }: { summary: BillingSummary }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [portalPending, startPortal] = useTransition()
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [passPending, setPassPending] = useState(false)
  const [isPassCheckout, setIsPassCheckout] = useState(false)

  const plan = getPlan(summary.planId)
  const pct =
    summary.limit && summary.limit > 0
      ? Math.min(100, Math.round((summary.used / summary.limit) * 100))
      : 0

  // Reconcile immediately after returning from checkout, or auto-open checkout
  // when arriving from the pricing page with a ?plan= hint.
  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (sessionId) {
      reconcileCheckout(sessionId).then(() => {
        toast.success("You're all set — welcome to your new plan!")
        router.replace("/billing")
        router.refresh()
      })
      return
    }
    const passSessionId = searchParams.get("pass_session_id")
    if (passSessionId) {
      reconcileEventPass(passSessionId).then(() => {
        toast.success(`Your Event Pass is active — ${EVENT_PASS.sends} sends ready!`)
        router.replace("/billing")
        router.refresh()
      })
      return
    }
    if (searchParams.get("pass") === "1" && summary.canBuyPass) {
      router.replace("/billing")
      handleBuyPass()
      return
    }
    const planParam = searchParams.get("plan") as PlanId | null
    if (
      planParam &&
      planParam !== "free" &&
      planParam !== summary.planId &&
      ["starter", "family", "pro"].includes(planParam)
    ) {
      router.replace("/billing")
      handleSelect(planParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openPortal() {
    startPortal(async () => {
      const result = await createPortalSession()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      window.location.href = result.url
    })
  }

  async function handleSelect(planId: PlanId) {
    setPendingPlan(planId)
    const result = await createCheckout(planId)
    if (!result.ok) {
      toast.error(result.error)
      setPendingPlan(null)
      return
    }
    setIsPassCheckout(false)
    setClientSecret(result.clientSecret)
  }

  async function handleBuyPass() {
    setPassPending(true)
    const result = await createEventPassCheckout()
    if (!result.ok) {
      toast.error(result.error)
      setPassPending(false)
      return
    }
    setIsPassCheckout(true)
    setClientSecret(result.clientSecret)
  }

  const renewLabel = summary.currentPeriodEnd
    ? new Date(summary.currentPeriodEnd).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="flex flex-col gap-10">
      {/* Current plan summary */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <h2 className="mt-1 font-serif text-3xl text-foreground">
              {plan.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.priceInCents === 0
                ? "Free forever"
                : `${formatPrice(plan.priceInCents)}/month`}
              {summary.status !== "active" && summary.status !== "free" ? (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {summary.status.replace(/_/g, " ")}
                </span>
              ) : null}
            </p>
          </div>
          {summary.hasCustomer ? (
            <Button
              variant="outline"
              onClick={openPortal}
              disabled={portalPending}
            >
              {portalPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <CreditCard data-icon="inline-start" />
              )}
              Manage billing
            </Button>
          ) : null}
        </div>

        {/* Usage */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {summary.fromPass
                ? "Event Pass"
                : summary.lifetime
                  ? "Free notes used"
                  : "This month"}
            </span>
            <span className="font-medium text-foreground">
              {summary.unlimited
                ? `${summary.used} sent · Unlimited`
                : `${summary.used} / ${summary.limit} notes`}
            </span>
          </div>
          {!summary.unlimited ? (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}
        </div>

        {summary.fromPass ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {summary.passRemaining} of {EVENT_PASS.sends} sends remaining. Your
            Event Pass credits never expire.
          </p>
        ) : renewLabel ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {summary.cancelAtPeriodEnd
              ? `Your plan ends on ${renewLabel}. You'll move to Free after that.`
              : `Renews on ${renewLabel}.`}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Your {summary.limit ?? 20} free notes are yours to use anytime —
            they don&apos;t reset each month. Upgrade or grab an Event Pass for
            more.
          </p>
        )}
      </section>

      {/* One-time Event Pass offer (free users who don't yet have a pass) */}
      {summary.canBuyPass ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-md">
              <div className="flex flex-wrap items-center gap-2">
                <Ticket className="size-5 text-primary" />
                <h3 className="font-serif text-2xl text-foreground">
                  {EVENT_PASS.name}
                </h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  One-Time Purchase
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">
                {EVENT_PASS.blurb}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {EVENT_PASS.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <Check className="size-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3">
              <div>
                <span className="font-serif text-4xl text-foreground">
                  {formatPrice(EVENT_PASS.priceInCents)}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  one-time
                </span>
              </div>
              <Button onClick={handleBuyPass} disabled={passPending}>
                {passPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Ticket data-icon="inline-start" />
                )}
                Get the Event Pass
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Plan chooser */}
      <section>
        <h3 className="mb-4 font-serif text-2xl text-foreground">
          {plan.id === "pro" ? "Your plan" : "Change plan"}
        </h3>
        <PlanCards
          currentPlan={summary.planId}
          onSelect={handleSelect}
          pendingPlan={pendingPlan}
        />
      </section>

      <Dialog
        open={!!clientSecret}
        onOpenChange={(o) => {
          if (!o) {
            setClientSecret(null)
            setPendingPlan(null)
            setPassPending(false)
            setIsPassCheckout(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {isPassCheckout ? `Get your ${EVENT_PASS.name}` : "Complete your upgrade"}
            </DialogTitle>
            <DialogDescription>
              Enter your payment details below. You can apply a promo code at
              checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {clientSecret ? (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

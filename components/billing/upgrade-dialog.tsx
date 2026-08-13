"use client"

import { useCallback, useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { toast } from "sonner"

import { createCheckout } from "@/app/actions/billing"
import type { PlanId } from "@/lib/plans"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PlanCards } from "@/components/billing/plan-cards"

const UPGRADE_EVENT = "thankful:open-upgrade"

/** Opens the global upgrade dialog. Call from anywhere (e.g. limit errors). */
export function openUpgradeDialog(reason?: string) {
  window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { reason } }))
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
)

export function UpgradeDialog({ currentPlan }: { currentPlan: PlanId }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | undefined>()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { reason?: string }
      setReason(detail?.reason)
      setClientSecret(null)
      setPendingPlan(null)
      setOpen(true)
    }
    window.addEventListener(UPGRADE_EVENT, handler)
    return () => window.removeEventListener(UPGRADE_EVENT, handler)
  }, [])

  const handleSelect = useCallback(async (planId: PlanId) => {
    setPendingPlan(planId)
    const result = await createCheckout(planId)
    if (!result.ok) {
      toast.error(result.error)
      setPendingPlan(null)
      return
    }
    setClientSecret(result.clientSecret)
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset after the close animation so the cards don't flash back.
      setTimeout(() => {
        setClientSecret(null)
        setPendingPlan(null)
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={clientSecret ? "sm:max-w-xl" : "sm:max-w-4xl"}
        showCloseButton
      >
        {clientSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>Complete your upgrade</DialogTitle>
              <DialogDescription>
                Enter your payment details below. You can apply a promo code at
                checkout.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setClientSecret(null)
                setPendingPlan(null)
              }}
            >
              Back to plans
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                Choose your plan
              </DialogTitle>
              <DialogDescription>
                {reason ??
                  "Upgrade for more thank-you notes each month. Cancel anytime."}
              </DialogDescription>
            </DialogHeader>
            <PlanCards
              currentPlan={currentPlan}
              onSelect={handleSelect}
              pendingPlan={pendingPlan}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

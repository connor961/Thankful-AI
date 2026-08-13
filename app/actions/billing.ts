"use server"

import { headers } from "next/headers"

import { getUserId } from "@/lib/session"
import { stripe } from "@/lib/stripe"
import {
  ensureStripeCustomer,
  effectivePlan,
  fulfillEventPass,
  getSubscription,
  getUsage,
  hasAnyPass,
  syncSubscription,
  type Usage,
} from "@/lib/billing"
import {
  eventPassPriceId,
  getPlan,
  priceIdForPlan,
  type PlanId,
} from "@/lib/plans"

async function originFromHeaders(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}

export type CreateCheckoutResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: string }

/**
 * Creates a subscription-mode embedded Checkout session for the given plan and
 * returns its client secret. Price is resolved server-side from the plan id, so
 * the client can never choose an arbitrary amount. Promo codes are enabled.
 */
export async function createCheckout(
  planId: PlanId,
): Promise<CreateCheckoutResult> {
  const userId = await getUserId()
  const plan = getPlan(planId)
  const priceId = priceIdForPlan(planId)

  if (!priceId || plan.id === "free") {
    return { ok: false, error: "That plan can't be purchased." }
  }

  try {
    const customerId = await ensureStripeCustomer(userId)
    const origin = await originFromHeaders()

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: userId,
      subscription_data: { metadata: { userId, plan: plan.id } },
      return_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      // Live accounts enable Managed Payments by default, which would require a
      // product tax code. We don't do tax calculation, so disable it per session
      // to keep the classic subscription checkout behavior. (Param is newer than
      // the SDK's bundled types, hence the cast.)
      ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
    })

    if (!session.client_secret) {
      return { ok: false, error: "Could not start checkout." }
    }
    return { ok: true, clientSecret: session.client_secret }
  } catch (err) {
    console.log("[v0] createCheckout error:", err instanceof Error ? err.message : err)
    return { ok: false, error: "Could not start checkout. Please try again." }
  }
}

/**
 * Creates a one-time (payment-mode) embedded Checkout session for the Event
 * Pass. Only offered to users on the free plan who don't already hold a pass.
 * An idempotency key on the customer prevents duplicate sessions on retry.
 */
export async function createEventPassCheckout(): Promise<CreateCheckoutResult> {
  const userId = await getUserId()
  const priceId = eventPassPriceId()

  if (!priceId) {
    return { ok: false, error: "The Event Pass isn't available right now." }
  }

  // Guard the free-users-only + one-pass rules server-side (never trust the UI).
  const sub = await getSubscription(userId)
  if (effectivePlan(sub).id !== "free") {
    return { ok: false, error: "You're on a paid plan — no pass needed." }
  }
  if (await hasAnyPass(userId)) {
    return { ok: false, error: "You already have an Event Pass." }
  }

  try {
    const customerId = await ensureStripeCustomer(userId)
    const origin = await originFromHeaders()

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: userId,
        payment_intent_data: { metadata: { userId, kind: "event_pass" } },
        metadata: { userId, kind: "event_pass" },
        return_url: `${origin}/billing?pass_session_id={CHECKOUT_SESSION_ID}`,
        ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
      },
      { idempotencyKey: `event-pass-${userId}` },
    )

    if (!session.client_secret) {
      return { ok: false, error: "Could not start checkout." }
    }
    return { ok: true, clientSecret: session.client_secret }
  } catch (err) {
    console.log(
      "[v0] createEventPassCheckout error:",
      err instanceof Error ? err.message : err,
    )
    return { ok: false, error: "Could not start checkout. Please try again." }
  }
}

/**
 * Reconciles an Event Pass purchase immediately after checkout return, so
 * credits appear without waiting on the webhook. Idempotent via the session id.
 */
export async function reconcileEventPass(sessionId: string): Promise<void> {
  const userId = await getUserId()
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.client_reference_id !== userId) return
    if (session.payment_status !== "paid") return
    if (session.metadata?.kind !== "event_pass") return
    await fulfillEventPass(userId, session.id)
  } catch (err) {
    console.log(
      "[v0] reconcileEventPass error:",
      err instanceof Error ? err.message : err,
    )
  }
}

export type PortalResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Creates a Stripe Customer Portal session so the user can manage their
 * subscription (upgrade/downgrade, cancel, payment methods, invoices).
 */
export async function createPortalSession(): Promise<PortalResult> {
  const userId = await getUserId()
  const sub = await getSubscription(userId)

  if (!sub.stripe_customer_id) {
    return { ok: false, error: "No billing account yet. Upgrade to a paid plan first." }
  }

  try {
    const origin = await originFromHeaders()
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/billing`,
    })
    return { ok: true, url: session.url }
  } catch (err) {
    console.log("[v0] portal error:", err instanceof Error ? err.message : err)
    return { ok: false, error: "Could not open the billing portal." }
  }
}

/**
 * Reconciles subscription state immediately after a successful checkout return,
 * so the UI reflects the new plan without waiting on the webhook. Idempotent:
 * the webhook may also process the same subscription.
 */
export async function reconcileCheckout(sessionId: string): Promise<void> {
  const userId = await getUserId()

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })
    if (session.client_reference_id !== userId) return
    const subscription = session.subscription
    if (!subscription || typeof subscription === "string") return

    await syncSubscription(userId, subscription)
  } catch (err) {
    console.log("[v0] reconcile error:", err instanceof Error ? err.message : err)
  }
}

/** Server action wrapper for fetching current usage (used by client polling). */
export async function fetchUsage(): Promise<Usage> {
  const userId = await getUserId()
  return getUsage(userId)
}

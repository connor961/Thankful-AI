import { type NextRequest, NextResponse } from "next/server"

import { stripe } from "@/lib/stripe"
import {
  fulfillEventPass,
  syncSubscription,
  userIdForCustomer,
  upsertSubscription,
} from "@/lib/billing"
import { type PlanId } from "@/lib/plans"

// Stripe requires the raw body to verify the signature.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.log("[v0] webhook: STRIPE_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 })
  }

  const body = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.log("[v0] webhook signature verification failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const userId =
          session.client_reference_id ??
          (session.customer
            ? await userIdForCustomer(session.customer as string)
            : null)
        if (!userId) break

        // One-time Event Pass purchase: grant credits (idempotent by session id).
        if (session.mode === "payment" && session.metadata?.kind === "event_pass") {
          if (session.payment_status === "paid") {
            await fulfillEventPass(userId, session.id)
          }
          break
        }

        // Subscription checkout.
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          )
          await syncSubscription(userId, subscription)
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object
        const userId = await userIdForCustomer(subscription.customer as string)
        if (userId) await syncSubscription(userId, subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const customerId = subscription.customer as string
        const userId = await userIdForCustomer(customerId)
        if (userId) {
          // Downgrade to free but keep the customer mapping.
          await upsertSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            plan: "free" as PlanId,
            status: "canceled",
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          })
        }
        break
      }
    }
  } catch (err) {
    console.log("[v0] webhook handler error:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

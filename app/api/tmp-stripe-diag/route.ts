import { NextResponse } from "next/server"

import { stripe } from "@/lib/stripe"
import { PLANS, EVENT_PASS } from "@/lib/plans"

export const runtime = "nodejs"

/** TEMP diagnostic: verifies Stripe config + a real embedded checkout session. */
export async function GET() {
  const out: Record<string, unknown> = {}

  // 1) Key modes (report mode only, never the secret itself).
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
  out.publishableKeyMode = pk.startsWith("pk_live_")
    ? "live"
    : pk.startsWith("pk_test_")
      ? "test"
      : pk
        ? "unknown"
        : "MISSING"
  out.webhookSecretSet = !!process.env.STRIPE_WEBHOOK_SECRET

  // 2) Resolve + retrieve every configured price id.
  const priceChecks: Record<string, unknown> = {}
  const entries: { key: string; env?: string }[] = [
    ...PLANS.filter((p) => p.priceEnvKey).map((p) => ({
      key: p.id,
      env: p.priceEnvKey,
    })),
    { key: "event_pass", env: EVENT_PASS.priceEnvKey },
  ]
  for (const { key, env } of entries) {
    const priceId = env ? process.env[env] : undefined
    if (!priceId) {
      priceChecks[key] = { env, status: "ENV_MISSING" }
      continue
    }
    try {
      const price = await stripe.prices.retrieve(priceId)
      priceChecks[key] = {
        env,
        idPrefix: priceId.slice(0, 8),
        active: price.active,
        livemode: price.livemode,
        currency: price.currency,
        unitAmount: price.unit_amount,
        type: price.type,
        interval: price.recurring?.interval ?? null,
      }
    } catch (err) {
      priceChecks[key] = {
        env,
        idPrefix: priceId.slice(0, 8),
        status: "RETRIEVE_FAILED",
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
  out.prices = priceChecks

  // 3) Actually create an embedded subscription checkout session (Starter),
  //    exactly like createCheckout, to confirm it returns a client secret.
  try {
    const starter = PLANS.find((p) => p.id === "starter")!
    const priceId = process.env[starter.priceEnvKey as string]
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      line_items: [{ price: priceId as string, quantity: 1 }],
      allow_promotion_codes: true,
      return_url: "https://example.com/billing?session_id={CHECKOUT_SESSION_ID}",
      ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
    })
    out.checkoutSession = {
      created: true,
      livemode: session.livemode,
      hasClientSecret: !!session.client_secret,
      status: session.status,
    }
    // Clean up the throwaway session so it doesn't linger.
    try {
      await stripe.checkout.sessions.expire(session.id)
    } catch {
      /* ignore */
    }
  } catch (err) {
    out.checkoutSession = {
      created: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return NextResponse.json(out, { status: 200 })
}

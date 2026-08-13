import "server-only"

import type Stripe from "stripe"

import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/admin"
import { stripe } from "@/lib/stripe"
import {
  EVENT_PASS,
  getPlan,
  planForPriceId,
  type Plan,
  type PlanId,
} from "@/lib/plans"

export type EventPassRow = {
  id: string
  user_id: string
  stripe_session_id: string | null
  sends_total: number
  sends_used: number
  status: string
  created_at: string
  updated_at: string
}

/** The user's active Event Pass with remaining sends, if any. */
export async function getActivePass(
  userId: string,
): Promise<(EventPassRow & { remaining: number }) | null> {
  const rows = (await sql`
    SELECT * FROM event_passes
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1
  `) as EventPassRow[]
  const pass = rows[0]
  if (!pass) return null
  return { ...pass, remaining: Math.max(0, pass.sends_total - pass.sends_used) }
}

export type SubscriptionRow = {
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanId
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export type Usage = {
  plan: Plan
  used: number
  limit: number | null
  remaining: number | null
  unlimited: boolean
  atLimit: boolean
  /** End of the current usage window (ISO), for display. */
  periodEnd: string
  /**
   * When true, entitlement comes from a one-time Event Pass rather than a
   * subscription. `used`/`limit`/`remaining` then reflect the pass credit pool
   * (which never resets), and `periodEnd` is not meaningful.
   */
  fromPass: boolean
}

/**
 * Returns the user's subscription row, or a synthesized free-plan default when
 * none exists yet. A `status` of `active` or `trialing` is considered valid;
 * anything else (past_due, canceled) falls back to free entitlements.
 */
export async function getSubscription(userId: string): Promise<SubscriptionRow> {
  const rows = (await sql`
    SELECT * FROM subscriptions WHERE user_id = ${userId}
  `) as SubscriptionRow[]

  if (rows[0]) return rows[0]

  return {
    user_id: userId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: "free",
    status: "active",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/** True when the subscription entitles the user to its paid plan right now. */
function isEntitled(sub: SubscriptionRow): boolean {
  return sub.status === "active" || sub.status === "trialing"
}

/** The effective plan, downgrading to free when the subscription isn't valid. */
export function effectivePlan(sub: SubscriptionRow): Plan {
  if (!isEntitled(sub)) return getPlan("free")
  return getPlan(sub.plan)
}

/** Start of the current usage window: Stripe period for paid, else calendar month. */
function periodBounds(sub: SubscriptionRow): { start: Date; end: Date } {
  const now = new Date()
  if (
    isEntitled(sub) &&
    sub.plan !== "free" &&
    sub.current_period_start &&
    sub.current_period_end
  ) {
    return {
      start: new Date(sub.current_period_start),
      end: new Date(sub.current_period_end),
    }
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { start, end }
}

/** Computes usage for the current billing/calendar window. */
export async function getUsage(userId: string): Promise<Usage> {
  // Admin accounts (internal testing + live demos) get full entitlements
  // without a Stripe subscription: the top "pro" plan, treated as unlimited so
  // note caps, media upload, and multi-event gating never block them. We still
  // report the real sends count so the demo UI shows accurate numbers.
  if (await isAdmin(userId)) {
    const proPlan = getPlan("pro")
    const now = new Date()
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const rows = (await sql`
      SELECT COUNT(*)::int AS count
      FROM note_sends
      WHERE user_id = ${userId}
        AND sent_at >= ${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()}
    `) as { count: number }[]
    return {
      plan: proPlan,
      used: rows[0]?.count ?? 0,
      limit: null,
      remaining: null,
      unlimited: true,
      atLimit: false,
      periodEnd: monthEnd.toISOString(),
      fromPass: false,
    }
  }

  const sub = await getSubscription(userId)
  const plan = effectivePlan(sub)

  // A one-time Event Pass only applies to users without a paid subscription.
  // Its credit pool (sends_used out of sends_total) never resets, so it takes
  // precedence over the free monthly window when present.
  if (plan.id === "free") {
    const pass = await getActivePass(userId)
    if (pass) {
      const passPlan = getPlan("free")
      return {
        plan: passPlan,
        used: pass.sends_used,
        limit: pass.sends_total,
        remaining: pass.remaining,
        unlimited: false,
        atLimit: pass.remaining <= 0,
        periodEnd: end0().toISOString(),
        fromPass: true,
      }
    }
  }

  const { start, end } = periodBounds(sub)

  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM note_sends
    WHERE user_id = ${userId} AND sent_at >= ${start.toISOString()}
  `) as { count: number }[]
  const used = rows[0]?.count ?? 0

  const unlimited = plan.monthlyLimit === null
  const limit = plan.monthlyLimit
  const remaining = unlimited ? null : Math.max(0, (limit as number) - used)

  return {
    plan,
    used,
    limit,
    remaining,
    unlimited,
    atLimit: !unlimited && used >= (limit as number),
    periodEnd: end.toISOString(),
    fromPass: false,
  }
}

/** Far-future placeholder end date for pass usage (credits never expire). */
function end0(): Date {
  return new Date(Date.UTC(9999, 0, 1))
}

/** Whether the user may send/generate one more note right now. */
export async function canSend(userId: string): Promise<boolean> {
  const usage = await getUsage(userId)
  return usage.unlimited || usage.used < (usage.limit as number)
}

/** Records a single note send in the usage ledger. */
export async function recordNoteSend(userId: string, noteId: string): Promise<void> {
  await sql`
    INSERT INTO note_sends (user_id, note_id) VALUES (${userId}, ${noteId})
  `

  // If entitlement is coming from an Event Pass, burn one credit from it and
  // mark it depleted when it runs out. Only applies to free-plan users; paid
  // subscribers are metered by note_sends against their monthly window.
  const sub = await getSubscription(userId)
  if (effectivePlan(sub).id !== "free") return

  await sql`
    UPDATE event_passes
    SET sends_used = sends_used + 1,
        status = CASE WHEN sends_used + 1 >= sends_total THEN 'depleted' ELSE status END,
        updated_at = now()
    WHERE id = (
      SELECT id FROM event_passes
      WHERE user_id = ${userId} AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
    )
  `
}

/**
 * Returns the Stripe customer id for the user, creating (and persisting) one if
 * needed. Reuses the subscriptions row as the mapping store.
 */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const sub = await getSubscription(userId)

  // If we already have a customer id, make sure it actually exists in the
  // *current* Stripe account. A stored id can become invalid when the account
  // is switched (e.g. test/sandbox -> live) or if the customer was deleted.
  if (sub.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(sub.stripe_customer_id)
      if (existing && !(existing as Stripe.DeletedCustomer).deleted) {
        return sub.stripe_customer_id
      }
    } catch {
      // Falls through to create a fresh customer below.
    }
  }

  const userRows = (await sql`
    SELECT email, name FROM "user" WHERE id = ${userId}
  `) as { email: string; name: string | null }[]
  const user = userRows[0]

  const customer = await stripe.customers.create({
    email: user?.email,
    name: user?.name ?? undefined,
    metadata: { userId },
  })

  await sql`
    INSERT INTO subscriptions (user_id, stripe_customer_id, plan, status)
    VALUES (${userId}, ${customer.id}, 'free', 'active')
    ON CONFLICT (user_id)
    DO UPDATE SET stripe_customer_id = ${customer.id}, updated_at = now()
  `

  return customer.id
}

/**
 * Upserts subscription state from Stripe (used by the webhook and by the
 * post-checkout reconcile). Plan is derived from the price id by the caller.
 */
export async function upsertSubscription(input: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  plan: PlanId
  status: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}): Promise<void> {
  await sql`
    INSERT INTO subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id, plan, status,
      current_period_start, current_period_end, cancel_at_period_end, updated_at
    ) VALUES (
      ${input.userId}, ${input.stripeCustomerId}, ${input.stripeSubscriptionId},
      ${input.plan}, ${input.status},
      ${input.currentPeriodStart ? input.currentPeriodStart.toISOString() : null},
      ${input.currentPeriodEnd ? input.currentPeriodEnd.toISOString() : null},
      ${input.cancelAtPeriodEnd}, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at = now()
  `
}

/**
 * Grants an Event Pass to a user after a successful one-time checkout. Keyed on
 * the Stripe checkout session id so repeated webhook/reconcile calls are
 * idempotent and never grant duplicate credits.
 */
export async function fulfillEventPass(
  userId: string,
  sessionId: string,
): Promise<void> {
  await sql`
    INSERT INTO event_passes (user_id, stripe_session_id, sends_total, sends_used, status)
    VALUES (${userId}, ${sessionId}, ${EVENT_PASS.sends}, 0, 'active')
    ON CONFLICT (stripe_session_id) DO NOTHING
  `
}

/**
 * True if the user has ever purchased an Event Pass (active or depleted). Used
 * to decide whether the one-time offer should still be shown.
 */
export async function hasAnyPass(userId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT 1 FROM event_passes WHERE user_id = ${userId} LIMIT 1
  `) as unknown[]
  return rows.length > 0
}

/** Finds the user id mapped to a Stripe customer id (webhook lookups). */
export async function userIdForCustomer(customerId: string): Promise<string | null> {
  const rows = (await sql`
    SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId}
  `) as { user_id: string }[]
  return rows[0]?.user_id ?? null
}

/**
 * Maps a Stripe subscription object into our subscriptions row. Shared by the
 * webhook and the post-checkout reconcile so both stay in sync. The plan is
 * derived from the subscription's price id.
 */
export async function syncSubscription(
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const item = subscription.items.data[0]
  const priceId = item?.price.id
  const plan = planForPriceId(priceId)
  const periodStart = item?.current_period_start ?? null
  const periodEnd = item?.current_period_end ?? null

  await upsertSubscription({
    userId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    plan: (plan?.id ?? "free") as PlanId,
    status: subscription.status,
    currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })
}

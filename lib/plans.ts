export type PlanId = "free" | "starter" | "family" | "pro"

export type Plan = {
  id: PlanId
  name: string
  /** Monthly price in cents. */
  priceInCents: number
  /**
   * Notes that can be sent/generated per period. `null` = unlimited.
   * For lifetime plans (see `lifetime`), this is a one-time total that never
   * resets rather than a per-month allowance.
   */
  monthlyLimit: number | null
  /**
   * When true, `monthlyLimit` is a one-time lifetime allowance that never
   * resets (used for the Free trial tier). When false/undefined, the limit is
   * a recurring per-period allowance.
   */
  lifetime?: boolean
  /** Env var name holding the Stripe recurring price id (paid plans only). */
  priceEnvKey?: string
  tagline: string
  features: string[]
  popular?: boolean
}

/**
 * The source of truth for plan entitlements. Limits here are authoritative for
 * permission checks — never trust a plan/limit value coming from the client.
 * Stripe price ids are resolved from env so the same config works across the
 * test sandbox and live mode.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceInCents: 0,
    monthlyLimit: 20,
    lifetime: true,
    tagline: "Try the product free — no card, no monthly reset.",
    features: [
      "20 thank-you notes to start",
      "Yours to use anytime — no monthly reset",
      "AI thank-you note generation",
      "Record, upload, or type your gifts",
      "Email delivery",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceInCents: 500,
    monthlyLimit: 100,
    priceEnvKey: "STRIPE_PRICE_STARTER",
    tagline: "Perfect for birthdays and occasional celebrations.",
    features: [
      "100 thank-you notes per month",
      "Everything in Free",
      "Print & mail: fold cards, postcards & address labels",
      "Photo cards in emails",
      "Faster AI generation",
    ],
  },
  {
    id: "family",
    name: "Family",
    priceInCents: 1000,
    monthlyLimit: 1000,
    priceEnvKey: "STRIPE_PRICE_FAMILY",
    tagline: "Built for families who celebrate year-round.",
    popular: true,
    features: [
      "1,000 thank-you notes per month",
      "Everything in Starter",
      "Video & audio upload with auto-transcription",
      "Multiple events",
      "Saved contacts & address book",
      "Bulk note generation",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceInCents: 2900,
    monthlyLimit: null,
    priceEnvKey: "STRIPE_PRICE_UNLIMITED",
    tagline: "For professionals, event planners, photographers, and businesses.",
    features: [
      "Unlimited thank-you notes",
      "Print & mail: fold cards, postcards & address labels",
      "Video & audio upload with auto-transcription",
      "Unlimited events",
      "Client management",
      "Custom branding",
      "CSV import/export",
      "Priority AI processing",
      "Early access & future API",
      "Premium support",
    ],
  },
]

export const FREE_PLAN = PLANS[0]

/**
 * One-time "Event Pass" — NOT a subscription tier. A single $29 purchase grants
 * a fixed pack of 250 sends that never expire, scoped to one event. Positioned as
 * a dedicated product for one major life event (wedding, baby shower, etc.) rather
 * than a recurring plan. Sold only to users on the Free plan; tracked in the
 * `event_passes` table, not `subscriptions`.
 */
export const EVENT_PASS = {
  id: "event_pass" as const,
  name: "Event Pass",
  priceInCents: 2900,
  sends: 250,
  events: 1,
  tagline: "Everything you need for one big celebration.",
  blurb:
    "Perfect for weddings, baby showers, graduations, retirement parties, and other large events. Pay once and use your credits whenever you're ready. No subscription required.",
  priceEnvKey: "STRIPE_PRICE_EVENT_PASS",
  features: [
    "250 thank-you notes",
    "Covers one event",
    "Credits never expire",
    "Print & mail: fold cards, postcards & address labels",
    "AI note generation",
    "Transcript upload",
    "Manual gift entry",
    "Email delivery",
  ],
}

/** Resolves the configured Stripe one-time price id for the Event Pass, or null. */
export function eventPassPriceId(): string | null {
  return process.env[EVENT_PASS.priceEnvKey] ?? null
}

/**
 * Plans entitled to upload a video/audio recording and have it auto-transcribed.
 * This is the authoritative gate: the upload token route and the transcription
 * action both check it, so the client can never unlock the feature by tampering.
 */
export const MEDIA_UPLOAD_PLANS: PlanId[] = ["family", "pro"]

/** Whether the given plan may upload video/audio for transcription. */
export function canUploadMedia(id: string | null | undefined): boolean {
  return MEDIA_UPLOAD_PLANS.includes(getPlan(id).id)
}

/**
 * Subscription plans that unlock printing & mailing (fold cards, postcards, and
 * address labels). The Free trial tier is intentionally excluded — printing is
 * a paid feature. A one-time Event Pass ALSO unlocks printing, but that isn't a
 * plan, so it's handled in the billing layer (see `getUsage().canPrint`), not
 * here. Use `Usage.canPrint` for the real check whenever a pass might apply.
 */
export const PRINT_PLANS: PlanId[] = ["starter", "family", "pro"]

/** Whether the given subscription plan (ignoring passes) unlocks printing. */
export function planCanPrint(id: string | null | undefined): boolean {
  return PRINT_PLANS.includes(getPlan(id).id)
}

/**
 * The lifetime allowance for the Free tier: 20 notes total, no monthly reset.
 * Kept as a named constant so copy and enforcement can't drift apart.
 */
export const FREE_LIFETIME_LIMIT = 20

/**
 * The moment the lifetime Free allowance began counting. Free-tier usage counts
 * only notes sent on/after this instant, so switching from the old monthly
 * model starts every existing free user fresh at 0 rather than retroactively
 * charging them for notes sent under the previous pricing. Paid plans and Event
 * Passes are unaffected (they meter against their own windows/pools).
 */
export const FREE_TIER_EPOCH = new Date("2026-08-15T00:00:00.000Z")

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? FREE_PLAN
}

/** Resolves the configured Stripe price id for a paid plan, or null. */
export function priceIdForPlan(id: PlanId): string | null {
  const plan = getPlan(id)
  if (!plan.priceEnvKey) return null
  return process.env[plan.priceEnvKey] ?? null
}

/** Maps a Stripe price id back to a plan (used by the webhook). */
export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null
  for (const plan of PLANS) {
    if (plan.priceEnvKey && process.env[plan.priceEnvKey] === priceId) {
      return plan
    }
  }
  return null
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "$0"
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

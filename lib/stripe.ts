import "server-only"

import Stripe from "stripe"

// The live secret key is stored in STRIPE_ACCESS_TOKEN; fall back to
// STRIPE_SECRET_KEY (e.g. a dedicated/restricted key) when it's set.
const secretKey = process.env.STRIPE_ACCESS_TOKEN || process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  throw new Error("No Stripe secret key set (STRIPE_ACCESS_TOKEN / STRIPE_SECRET_KEY)")
}

// Pin to the SDK's bundled API version by omitting `apiVersion`.
export const stripe = new Stripe(secretKey)

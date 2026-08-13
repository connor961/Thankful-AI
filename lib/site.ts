/**
 * Canonical site metadata shared across pages, sitemap, and robots.
 *
 * The production URL is derived the same way `lib/auth.ts` derives its base
 * URL, so canonical links, OpenGraph URLs, and the sitemap all agree with where
 * the app actually lives. Falls back to localhost in local dev.
 */

export const SITE_NAME = "Thankful"

export const SITE_DESCRIPTION =
  "Thankful keeps track of every gift, who gave it, and what made it meaningful — so you can say thank you in your own voice. Record, upload, or type; let AI draft, work hybrid, or write every word yourself."

/**
 * The canonical production domain. This is the single source of truth for the
 * public URL — update it here if the primary domain ever changes. Setting the
 * BETTER_AUTH_URL env var still overrides it (useful for staging), but even
 * without any env var, production resolves to this.
 */
export const PRODUCTION_URL = "https://thankfulai.org"

/**
 * Origins Better Auth should trust in production: the apex domain and its www
 * subdomain. Both are covered so auth works regardless of which one a visitor
 * lands on.
 */
export function productionOrigins(): string[] {
  return ["https://thankfulai.org", "https://www.thankfulai.org"]
}

export function siteUrl(): string {
  // Explicit override wins (e.g. a staging deployment pointing elsewhere).
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL.replace(/\/+$/, "")
  }
  // Any production build (production + preview on Vercel) canonicalizes to the
  // real domain so SEO tags, the sitemap, and OG links always point home.
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_URL
  }
  // Local dev / v0 preview.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return (process.env.V0_RUNTIME_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  )
}

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

export function siteUrl(): string {
  const url =
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.V0_RUNTIME_URL ?? "http://localhost:3000"))

  // Normalize away any trailing slash so callers can safely append paths.
  return url.replace(/\/+$/, "")
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, retryAfterPhrase } from "@/lib/rate-limit"

/**
 * Per-IP rate limiting for the abuse-prone auth endpoints. These are HTTP
 * routes handled by Better Auth's catch-all (`/api/auth/[...all]`), not server
 * actions, so they can't use the per-user `throttle()` helper — an attacker
 * guessing passwords or bombing password-reset emails has no session yet.
 * Keying on IP is the right identity here.
 *
 * Proxy runs on the Node.js runtime in Next.js 16, so the HTTP-based Upstash
 * client works. Everything else falls through untouched.
 */

// Only the endpoints that create an account action, sign a user in, or trigger
// an outbound email. Reads like get-session are intentionally not limited.
const AUTH_LIMITED = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
])
const RESET_LIMITED = new Set([
  "/api/auth/request-password-reset",
  "/api/auth/reset-password",
])

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const bucket = AUTH_LIMITED.has(path)
    ? ("auth" as const)
    : RESET_LIMITED.has(path)
      ? ("reset" as const)
      : null

  if (!bucket) return NextResponse.next()

  const { success, retryAfter } = await checkRateLimit(bucket, clientIp(request))
  if (success) return NextResponse.next()

  // Match Better Auth's JSON error shape so the client surfaces it cleanly.
  return NextResponse.json(
    {
      message: `Too many attempts. Please try again in ${retryAfterPhrase(retryAfter)}.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  )
}

export const config = {
  // Scope the proxy to just the auth API so nothing else pays the cost.
  matcher: ["/api/auth/:path*"],
}

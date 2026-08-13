import "server-only"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Rate limiting for the endpoints that either cost us money on every call
 * (AI transcription / note generation, transactional email) or are abuse
 * targets (auth + password reset). Backed by Upstash Redis so the counters are
 * shared across all serverless invocations.
 *
 * The Upstash integration exposes its REST credentials under Vercel's `KV_*`
 * names rather than the `UPSTASH_REDIS_REST_*` names `Redis.fromEnv()` expects,
 * so we build the client explicitly.
 */
const url = process.env.KV_REST_API_URL
const token = process.env.KV_REST_API_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

/**
 * Builds a limiter, or returns null when Redis isn't configured. A null limiter
 * makes `checkRateLimit` fail open (see below) so a missing/unhealthy Redis
 * never takes the whole app down — we'd rather occasionally miss a limit than
 * block every paying user.
 */
function makeLimiter(
  tokens: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
  prefix: string,
) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `thankful:rl:${prefix}`,
    analytics: false,
  })
}

/**
 * Named limiters, tuned per action class. These ceilings are generous for a
 * real person but stop scripted abuse and runaway retry loops:
 *
 * - `ai`     — transcription + note generation. The most expensive calls.
 * - `email`  — outbound gift-note emails via Resend.
 * - `auth`   — sign-in / sign-up attempts (brute-force protection), per IP.
 * - `reset`  — password-reset requests (inbox-bombing protection), per IP.
 */
const limiters = {
  ai: makeLimiter(30, "1 m", "ai"),
  email: makeLimiter(40, "1 h", "email"),
  auth: makeLimiter(10, "1 m", "auth"),
  reset: makeLimiter(5, "1 h", "reset"),
} as const

export type RateLimitBucket = keyof typeof limiters

export type RateLimitResult = {
  success: boolean
  /** Seconds until the caller may retry, when throttled. */
  retryAfter: number
}

/**
 * Checks a request against the named limiter for `identifier` (a user id or an
 * IP). Fails open: if Redis isn't configured or errors, the request is allowed.
 */
export async function checkRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = limiters[bucket]
  if (!limiter) return { success: true, retryAfter: 0 }

  try {
    const { success, reset } = await limiter.limit(identifier)
    const retryAfter = success
      ? 0
      : Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return { success, retryAfter }
  } catch (err) {
    console.error("[v0] rate limit check failed, allowing request:", err)
    return { success: true, retryAfter: 0 }
  }
}

/**
 * A friendly, human-readable "try again in N" phrase for throttle messages.
 */
export function retryAfterPhrase(seconds: number): string {
  if (seconds <= 0) return "a moment"
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? "" : "s"}`
}

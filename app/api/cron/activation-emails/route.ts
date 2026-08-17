import { NextResponse } from "next/server"
import { runSequence } from "@/lib/lifecycle-emails"

// Always run fresh; never cache the cron response.
export const dynamic = "force-dynamic"

/**
 * Daily cron entry point for the activation email sequence.
 *
 * Security: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We reject
 * any request whose bearer token doesn't match, so this endpoint can't be
 * triggered publicly. If CRON_SECRET is unset we fail CLOSED (401) rather than
 * running unauthenticated.
 *
 * Rollout: sends only when LIFECYCLE_EMAILS_ENABLED === "true". Otherwise it
 * runs in dry-run mode — logging exactly who *would* be emailed and sending
 * nothing — so targeting can be validated against real data before going live.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 401 },
    )
  }

  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dryRun = process.env.LIFECYCLE_EMAILS_ENABLED !== "true"

  try {
    const summary = await runSequence({ dryRun })
    console.log(
      `[v0] lifecycle run complete: dryRun=${summary.dryRun} considered=${summary.considered} sent=${summary.sent.length} errors=${summary.errors.length}`,
    )
    return NextResponse.json(summary)
  } catch (err) {
    console.log(
      `[v0] lifecycle run failed: ${err instanceof Error ? err.message : "unknown error"}`,
    )
    return NextResponse.json(
      { error: "Activation email run failed" },
      { status: 500 },
    )
  }
}

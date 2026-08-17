import "server-only"

import crypto from "node:crypto"
import { Resend } from "resend"
import { sql } from "@/lib/db"
import { siteUrl } from "@/lib/site"
import { FREE_LIFETIME_LIMIT } from "@/lib/plans"

/**
 * Activation ("re-engagement") email sequence.
 *
 * Target: users who created an account but have NEVER sent a thank-you note
 * (zero rows in `note_sends`). We nudge them at day 1, 3, and 7, then stop.
 * Sending a note or unsubscribing removes them from all future steps.
 *
 * Everything here is server-only and side-effect-free until `runSequence` is
 * called. The cron route decides dry-run vs. live via `LIFECYCLE_EMAILS_ENABLED`.
 */

const FALLBACK_FROM = "Thank You <thankyou@capstoneconsulting.co>"

/** A single step in the sequence. `step` doubles as the "day" and the unique key. */
type SequenceStep = {
  step: number
  /** Minimum account age, in whole days, before this step may send. */
  minAgeDays: number
  subject: string
  /** Short heading shown in the email body. */
  heading: string
  /** Body paragraphs (plain strings; rendered into <p> tags). */
  body: string[]
  /** Primary button label + destination path (relative to the site root). */
  ctaLabel: string
  ctaPath: string
}

/**
 * The three-email sequence. Copy is intentionally warm and low-pressure — the
 * goal is to help, not to hound. Each step assumes the reader has an account
 * but hasn't sent a note yet.
 */
export const SEQUENCE: SequenceStep[] = [
  {
    step: 1,
    minAgeDays: 1,
    subject: "Your first thank-you note is easier than you think",
    heading: "Ready when you are",
    body: [
      "Thanks for joining Thankful! You signed up to make saying thank you easier — and the best part is, your first note takes only a couple of minutes.",
      "Just tell us who gave you what (record it, upload a list, or type it in) and we'll help you turn it into a warm, personal note in your own voice. You choose how hands-on to be.",
      `You've got ${FREE_LIFETIME_LIMIT} free notes to start — no card required, and they never expire.`,
    ],
    ctaLabel: "Write my first note",
    ctaPath: "/events/new",
  },
  {
    step: 3,
    minAgeDays: 3,
    subject: "A quicker way to thank everyone",
    heading: "Not sure where to start?",
    body: [
      "If a big pile of thank-you notes feels daunting, you're not alone — that's exactly why we built Thankful.",
      "You don't have to write them one by one from a blank page. Capture all your gifts at once, and we'll draft heartfelt notes for each person. Tweak the wording, or let us handle it end to end.",
      "Want to see how it feels first? Explore a ready-made sample event with a single click — no data entry needed.",
    ],
    ctaLabel: "See how it works",
    ctaPath: "/",
  },
  {
    step: 7,
    minAgeDays: 7,
    subject: "Still here whenever you're ready to say thanks",
    heading: "No rush — we saved your spot",
    body: [
      "Life gets busy, and thank-you notes have a way of slipping down the list. Whenever you're ready, Thankful will make them quick and genuinely personal.",
      "Your free notes are still waiting for you, and your account is right where you left it. It only takes a few minutes to cross this off your list.",
      "We'd love to help you say thank you — beautifully.",
    ],
    ctaLabel: "Pick up where I left off",
    ctaPath: "/",
  },
]

/** A user eligible to receive a given step. */
export type EligibleUser = {
  userId: string
  email: string
  name: string | null
  step: number
}

// ---------------------------------------------------------------------------
// Unsubscribe tokens (stateless, HMAC-based — no storage needed)
// ---------------------------------------------------------------------------

function unsubscribeSecret(): string {
  // Reuse the app secret so tokens are stable across deploys without a new var.
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to sign unsubscribe links")
  }
  return secret
}

/** Deterministic, URL-safe HMAC of the user id for one-click unsubscribe. */
export function unsubscribeToken(userId: string): string {
  return crypto
    .createHmac("sha256", unsubscribeSecret())
    .update(`unsubscribe:${userId}`)
    .digest("hex")
}

/** Constant-time verification of an unsubscribe token. */
export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (!userId || !token) return false
  const expected = unsubscribeToken(userId)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** Absolute unsubscribe URL for a user, safe to embed in an email footer. */
export function unsubscribeUrl(userId: string): string {
  const base = siteUrl()
  const token = unsubscribeToken(userId)
  return `${base}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}`
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;")
}

/**
 * Renders an activation email to HTML in the warm "classic" house style
 * (paper background, coral accent bar, serif headings). Includes a single CTA
 * button and a footer with the tokenized unsubscribe link.
 */
export function renderEmail(params: {
  step: number
  name: string | null
  unsubscribeUrl: string
}): { subject: string; html: string; text: string } {
  const config = SEQUENCE.find((s) => s.step === params.step)
  if (!config) {
    throw new Error(`Unknown lifecycle step: ${params.step}`)
  }

  const firstName = params.name?.trim().split(/\s+/)[0]
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,"
  const ctaUrl = `${siteUrl()}${config.ctaPath}`
  const bodyHtml = config.body
    .map(
      (p) =>
        `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`,
    )
    .join("")

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:#f4efe7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe7;">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
            style="width:600px;max-width:600px;background:#fffdf9;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(61,50,44,0.10);">
            <tr>
              <td style="height:6px;line-height:6px;font-size:0;background:#c05a4d;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:40px 48px 4px;font-family:Georgia,'Times New Roman',serif;">
                <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c79a5b;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">
                  Thankful
                </p>
                <p style="margin:14px 0 0;font-size:26px;line-height:1.25;color:#3d322c;">
                  ${escapeHtml(config.heading)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 48px 8px;font-family:Georgia,'Times New Roman',serif;color:#4a3d36;font-size:16px;line-height:1.75;">
                <p style="margin:0 0 16px;">${greeting}</p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 48px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background:#c05a4d;border-radius:999px;">
                      <a href="${escapeAttr(ctaUrl)}"
                        style="display:inline-block;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fffdf9;text-decoration:none;">
                        ${escapeHtml(config.ctaLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 48px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="height:1px;line-height:1px;font-size:0;background:#efe6d8;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a89a8d;">
                  You're receiving this because you created a Thankful account.
                  <br />
                  <a href="${escapeAttr(params.unsubscribeUrl)}" style="color:#a89a8d;text-decoration:underline;">
                    Unsubscribe from these tips
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `${firstName ? `Hi ${firstName},` : "Hi there,"}\n\n${config.body.join("\n\n")}\n\n${config.ctaLabel}: ${ctaUrl}\n\n—\nYou're receiving this because you created a Thankful account.\nUnsubscribe: ${params.unsubscribeUrl}`

  return { subject: config.subject, html, text }
}

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------

/**
 * Finds every user eligible for their next sequence step. Enforces all rules:
 * never sent a note, not opted out, step not already sent, account old enough,
 * and steps are strictly sequential (won't skip ahead if a prior step is
 * missing — so a missed cron day never fires two emails at once).
 *
 * One row per user max: the earliest un-sent step they currently qualify for.
 */
export async function findEligible(): Promise<EligibleUser[]> {
  // Pull candidate users: no note sends, not opted out. Include their sent
  // steps so we can compute the next sequential step in JS (clearer than SQL).
  const rows = (await sql`
    SELECT
      u.id AS user_id,
      u.email AS email,
      u.name AS name,
      u."createdAt" AS created_at,
      COALESCE(
        ARRAY_AGG(le.step) FILTER (WHERE le.step IS NOT NULL),
        ARRAY[]::int[]
      ) AS sent_steps
    FROM public."user" u
    LEFT JOIN public.note_sends ns ON ns.user_id = u.id
    LEFT JOIN public.email_opt_out oo ON oo.user_id = u.id
    LEFT JOIN public.lifecycle_emails le ON le.user_id = u.id
    WHERE ns.id IS NULL
      AND oo.user_id IS NULL
    GROUP BY u.id, u.email, u.name, u."createdAt"
  `) as {
    user_id: string
    email: string
    name: string | null
    created_at: string
    sent_steps: number[]
  }[]

  const now = Date.now()
  const eligible: EligibleUser[] = []

  for (const row of rows) {
    if (!row.email) continue
    const ageDays = (now - new Date(row.created_at).getTime()) / 86_400_000
    const sent = new Set(row.sent_steps ?? [])

    // Walk the sequence in order. The next step to send is the first one that:
    //  - hasn't been sent, and
    //  - the account is old enough for.
    // If an earlier step hasn't been sent yet but they're already old enough
    // for it, that earlier step is what they get (sequential, no skipping).
    for (const s of SEQUENCE) {
      if (sent.has(s.step)) continue
      if (ageDays >= s.minAgeDays) {
        eligible.push({
          userId: row.user_id,
          email: row.email,
          name: row.name,
          step: s.step,
        })
      }
      // Whether or not this step was eligible, stop at the first un-sent step:
      // we never skip ahead to a later step while an earlier one is pending.
      break
    }
  }

  return eligible
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type RunSummary = {
  dryRun: boolean
  considered: number
  sent: { userId: string; email: string; step: number }[]
  errors: { userId: string; step: number; error: string }[]
}

/**
 * Records that a step was sent, guaranteeing idempotency via the unique
 * (user_id, step) constraint. Returns false if the row already existed (a
 * concurrent run beat us to it), so we can skip the actual send.
 */
async function claimStep(userId: string, step: number): Promise<boolean> {
  const rows = (await sql`
    INSERT INTO public.lifecycle_emails (user_id, step)
    VALUES (${userId}, ${step})
    ON CONFLICT (user_id, step) DO NOTHING
    RETURNING id
  `) as { id: string }[]
  return rows.length > 0
}

/**
 * Finds eligible users and sends their next activation email. In dry-run mode
 * nothing is sent or recorded — it only logs who *would* be emailed, which is
 * how we validate targeting safely in production before going live.
 */
export async function runSequence({
  dryRun,
}: {
  dryRun: boolean
}): Promise<RunSummary> {
  const eligible = await findEligible()
  const summary: RunSummary = {
    dryRun,
    considered: eligible.length,
    sent: [],
    errors: [],
  }

  if (dryRun) {
    for (const u of eligible) {
      console.log(
        `[v0] lifecycle dry-run: would send step ${u.step} to ${u.email} (${u.userId})`,
      )
    }
    return summary
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log("[v0] lifecycle: RESEND_API_KEY missing, cannot send")
    summary.errors.push({
      userId: "-",
      step: 0,
      error: "RESEND_API_KEY not configured",
    })
    return summary
  }
  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM || FALLBACK_FROM

  for (const u of eligible) {
    // Claim the step first: if we can't claim it, another run already sent it.
    let claimed = false
    try {
      claimed = await claimStep(u.userId, u.step)
    } catch (err) {
      summary.errors.push({
        userId: u.userId,
        step: u.step,
        error: err instanceof Error ? err.message : "claim failed",
      })
      continue
    }
    if (!claimed) continue

    try {
      const { subject, html, text } = renderEmail({
        step: u.step,
        name: u.name,
        unsubscribeUrl: unsubscribeUrl(u.userId),
      })
      const { error } = await resend.emails.send({
        from,
        to: u.email,
        subject,
        html,
        text,
      })
      if (error) {
        throw new Error(error.message || "provider error")
      }
      summary.sent.push({ userId: u.userId, email: u.email, step: u.step })
    } catch (err) {
      // Roll back the claim so a transient failure can retry on the next run.
      try {
        await sql`
          DELETE FROM public.lifecycle_emails
          WHERE user_id = ${u.userId} AND step = ${u.step}
        `
      } catch {
        // If rollback fails, the worst case is we skip one retry — acceptable.
      }
      summary.errors.push({
        userId: u.userId,
        step: u.step,
        error: err instanceof Error ? err.message : "send failed",
      })
    }
  }

  return summary
}

/** Records an unsubscribe. Idempotent. */
export async function optOut(userId: string): Promise<void> {
  await sql`
    INSERT INTO public.email_opt_out (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `
}

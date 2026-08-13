import "server-only"
import { Resend } from "resend"
import type { EmailDesign } from "@/lib/types"
import { formatNoteForDisplay } from "@/lib/note-format"

export type SendEmailErrorCode =
  | "not_configured"
  | "invalid_recipient"
  | "provider_error"

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; code: SendEmailErrorCode; error: string }

/**
 * Default sender used when EMAIL_FROM is not set. This must be an address on a
 * domain verified in Resend to deliver to real recipients; the env var
 * EMAIL_FROM overrides it in every environment.
 */
const FALLBACK_FROM = "Thank You <thankyou@capstoneconsulting.co>"

/**
 * The bare email address notes are sent from (e.g. "thankyou@capstoneconsulting.co"),
 * derived from EMAIL_FROM or the fallback. Safe to surface in the UI so senders
 * know what address recipients will see. Server-only (reads process.env).
 */
export function outboundSenderAddress(): string {
  const from = process.env.EMAIL_FROM || FALLBACK_FROM
  const match = from.match(/<([^>]+)>/)
  return (match ? match[1] : from).trim()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

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
 * Splits a note into paragraphs, wrapping each in a <p> with the supplied inline
 * style so every design can control its own body typography while sharing the
 * same escaping and blank-line handling.
 */
function paragraphs(note: string, pStyle: string): string {
  return formatNoteForDisplay(note)
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="${pStyle}white-space:pre-line;">${escapeHtml(block)}</p>`,
    )
    .join("")
}

function isHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//.test(url)
}

/**
 * CLASSIC — a warm, greeting-card style email. Serif type leads, a gold
 * ornamental divider sits under an italic "Thank you", and the photo (if any)
 * drops into a soft rounded frame below the note.
 */
function renderClassic(note: string, photoUrl?: string): string {
  const body = paragraphs(note, "margin:0 0 20px;")
  const photoBlock = isHttpUrl(photoUrl)
    ? `<tr>
          <td style="padding:8px 48px 44px;">
            <img src="${escapeAttr(photoUrl)}" alt="A photo from us"
              width="504"
              style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:16px;box-shadow:0 8px 24px rgba(61,50,44,0.16);" />
          </td>
        </tr>`
    : ""

  return `<!doctype html>
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
              <td align="center" style="padding:44px 48px 8px;font-family:Georgia,'Times New Roman',serif;">
                <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c79a5b;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">
                  With Gratitude
                </p>
                <p style="margin:16px 0 0;font-size:30px;line-height:1.2;color:#3d322c;font-style:italic;">
                  Thank&nbsp;you
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0;">
                  <tr>
                    <td style="width:56px;height:1px;line-height:1px;font-size:0;background:#e4c58f;">&nbsp;</td>
                    <td style="padding:0 10px;font-size:14px;color:#d9ad6f;line-height:1;">&#10022;</td>
                    <td style="width:56px;height:1px;line-height:1px;font-size:0;background:#e4c58f;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 48px 8px;font-family:Georgia,'Times New Roman',serif;color:#4a3d36;font-size:17px;line-height:1.8;">
                ${body}
              </td>
            </tr>
            ${photoBlock}
            <tr>
              <td style="padding:8px 48px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="height:1px;line-height:1px;font-size:0;background:#efe6d8;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a89a8d;">
                  Sent with love &middot; a heartfelt thank-you note
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * MODERN — clean and minimal. Crisp sans-serif type, generous whitespace, a
 * hairline rule, and a small uppercase eyebrow. No ornament; the words carry it.
 */
function renderModern(note: string, photoUrl?: string): string {
  const body = paragraphs(note, "margin:0 0 18px;")
  const photoBlock = isHttpUrl(photoUrl)
    ? `<tr>
          <td style="padding:4px 44px 40px;">
            <img src="${escapeAttr(photoUrl)}" alt="A photo from us"
              width="512"
              style="display:block;width:100%;max-width:512px;height:auto;border:0;border-radius:8px;" />
          </td>
        </tr>`
    : ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
      <tr>
        <td align="center" style="padding:56px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
            style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;">
            <tr>
              <td style="padding:48px 44px 0;font-family:Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;font-weight:bold;">
                  Thank You
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
                  <tr>
                    <td style="width:40px;height:2px;line-height:2px;font-size:0;background:#18181b;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 44px 8px;font-family:Helvetica,Arial,sans-serif;color:#27272a;font-size:16px;line-height:1.7;">
                ${body}
              </td>
            </tr>
            ${photoBlock}
            <tr>
              <td style="padding:24px 44px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="height:1px;line-height:1px;font-size:0;background:#e4e4e7;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                  A thank-you note, sent with care.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * PLAYFUL — bright and festive. A bold coral header band, big rounded corners,
 * a confetti-dot flourish, and friendly rounded type. The photo gets an extra
 * rounded, cheerful frame.
 */
function renderPlayful(note: string, photoUrl?: string): string {
  const body = paragraphs(note, "margin:0 0 18px;")
  const dot = (color: string) =>
    `<td style="padding:0 5px;"><div style="width:10px;height:10px;border-radius:50%;background:${color};font-size:0;line-height:0;">&nbsp;</div></td>`
  const photoBlock = isHttpUrl(photoUrl)
    ? `<tr>
          <td style="padding:4px 40px 40px;">
            <img src="${escapeAttr(photoUrl)}" alt="A photo from us"
              width="520"
              style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:22px;box-shadow:0 10px 26px rgba(233,84,32,0.20);" />
          </td>
        </tr>`
    : ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:#fff4ec;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff4ec;">
      <tr>
        <td align="center" style="padding:44px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
            style="width:600px;max-width:600px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 16px 44px rgba(233,84,32,0.16);">
            <tr>
              <td align="center" style="padding:40px 40px 34px;background:#ff7a59;font-family:'Trebuchet MS',Verdana,Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:34px;line-height:1.1;color:#ffffff;font-weight:bold;">
                  Thank you! &#127881;
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0;">
                  <tr>
                    ${dot("#ffd166")}${dot("#ffffff")}${dot("#ef476f")}${dot("#ffffff")}${dot("#ffd166")}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 40px 8px;font-family:'Trebuchet MS',Verdana,Helvetica,Arial,sans-serif;color:#3f2a22;font-size:17px;line-height:1.75;">
                ${body}
              </td>
            </tr>
            ${photoBlock}
            <tr>
              <td align="center" style="padding:8px 40px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background:#fff0e6;border-radius:999px;padding:10px 22px;font-family:'Trebuchet MS',Verdana,Helvetica,Arial,sans-serif;font-size:12px;color:#e9622a;font-weight:bold;">
                      Made with joy &#183; a thank-you note
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

const RENDERERS: Record<
  EmailDesign,
  (note: string, photoUrl?: string) => string
> = {
  classic: renderClassic,
  modern: renderModern,
  playful: renderPlayful,
}

/**
 * A branded, self-contained password-reset email. Matches the "classic" note
 * aesthetic (warm paper, coral accent, serif headline) so the message clearly
 * comes from Thankful AI. The reset link is both a button and a visible URL so
 * it works even if the button is stripped by a client.
 */
function renderPasswordResetHtml(resetUrl: string, name?: string): string {
  const greeting = name?.trim() ? `Hi ${escapeHtml(name.trim())},` : "Hello,"
  const safeUrl = escapeAttr(resetUrl)
  const visibleUrl = escapeHtml(resetUrl)

  return `<!doctype html>
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
              <td align="center" style="padding:44px 48px 8px;font-family:Georgia,'Times New Roman',serif;">
                <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c79a5b;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">
                  Thankful AI
                </p>
                <p style="margin:16px 0 0;font-size:28px;line-height:1.2;color:#3d322c;">
                  Reset your password
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 48px 8px;font-family:Georgia,'Times New Roman',serif;color:#4a3d36;font-size:16px;line-height:1.7;">
                <p style="margin:0 0 16px;">${greeting}</p>
                <p style="margin:0 0 16px;">
                  We received a request to reset the password for your Thankful AI account.
                  Click the button below to choose a new password. This link will expire in one hour.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 48px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background:#c05a4d;border-radius:999px;">
                      <a href="${safeUrl}"
                        style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fffdf9;text-decoration:none;">
                        Reset password
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 48px 8px;font-family:Arial,Helvetica,sans-serif;color:#8a7d72;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 6px;">Or paste this link into your browser:</p>
                <p style="margin:0;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#c05a4d;">${visibleUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 48px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="height:1px;line-height:1px;font-size:0;background:#efe6d8;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a89a8d;">
                  If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash; your password will stay the same.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * Sends a password-reset email via Resend. Returns a typed result so the auth
 * layer can log failures without throwing during the reset request.
 */
export async function sendPasswordResetEmail(params: {
  to: string
  url: string
  name?: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      code: "not_configured",
      error:
        "Email sending isn't set up yet. Add a RESEND_API_KEY to enable it.",
    }
  }

  if (!isValidEmail(params.to)) {
    return {
      ok: false,
      code: "invalid_recipient",
      error: "That recipient email address doesn't look valid.",
    }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || FALLBACK_FROM,
      to: params.to.trim(),
      subject: "Reset your Thankful AI password",
      text: `We received a request to reset your Thankful AI password. Use this link to choose a new password (it expires in one hour):\n\n${params.url}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: renderPasswordResetHtml(params.url, params.name),
    })

    if (error) {
      return {
        ok: false,
        code: "provider_error",
        error: error.message || "The email provider rejected the request.",
      }
    }
    return { ok: true, id: data?.id ?? "" }
  } catch (err) {
    return {
      ok: false,
      code: "provider_error",
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong while sending the email.",
    }
  }
}

/** Renders a note to HTML using the chosen design, defaulting to classic. */
export function renderNoteHtml(
  note: string,
  photoUrl?: string,
  design: EmailDesign = "classic",
): string {
  const render = RENDERERS[design] ?? renderClassic
  return render(note, photoUrl)
}

/**
 * Sends a thank-you note via Resend. Returns a typed result instead of throwing
 * so callers can surface a precise, user-facing message.
 */
export async function sendNoteEmail(params: {
  to: string
  subject: string
  note: string
  photoUrl?: string
  replyTo?: string
  design?: EmailDesign
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      code: "not_configured",
      error:
        "Email sending isn't set up yet. Add a RESEND_API_KEY to enable it.",
    }
  }

  if (!isValidEmail(params.to)) {
    return {
      ok: false,
      code: "invalid_recipient",
      error: "That recipient email address doesn't look valid.",
    }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || FALLBACK_FROM,
      to: params.to.trim(),
      subject: params.subject,
      text: params.note,
      html: renderNoteHtml(params.note, params.photoUrl, params.design),
      replyTo: params.replyTo,
    })

    if (error) {
      return {
        ok: false,
        code: "provider_error",
        error: error.message || "The email provider rejected the request.",
      }
    }
    return { ok: true, id: data?.id ?? "" }
  } catch (err) {
    return {
      ok: false,
      code: "provider_error",
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong while sending the email.",
    }
  }
}

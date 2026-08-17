import { optOut, verifyUnsubscribeToken } from "@/lib/lifecycle-emails"

export const dynamic = "force-dynamic"

/**
 * One-click unsubscribe from activation ("tips") emails. The link in every
 * lifecycle email carries `u` (user id) and `t` (HMAC token). We verify the
 * token statelessly, record the opt-out, and return a small branded page.
 *
 * This route intentionally works with no login and leaks no information: an
 * invalid or tampered token gets the same friendly, generic page rather than
 * an error that would confirm whether a user id exists.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("u") ?? ""
  const token = searchParams.get("t") ?? ""

  let confirmed = false
  if (verifyUnsubscribeToken(userId, token)) {
    try {
      await optOut(userId)
      confirmed = true
    } catch (err) {
      console.log(
        `[v0] unsubscribe failed for ${userId}: ${err instanceof Error ? err.message : "unknown"}`,
      )
    }
  }

  const heading = confirmed ? "You're unsubscribed" : "You're all set"
  const message = confirmed
    ? "You won't receive any more getting-started tips from Thankful. You'll still get important account emails, like password resets and the thank-you notes you send."
    : "This unsubscribe link looks invalid or has expired, but there's nothing more you need to do. If you keep receiving tips you'd rather not, just reply to one of our emails and we'll take care of it."

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${heading} · Thankful</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe7;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe7;">
      <tr>
        <td align="center" style="padding:64px 16px;">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0"
            style="width:520px;max-width:520px;background:#fffdf9;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(61,50,44,0.10);">
            <tr>
              <td style="height:6px;line-height:6px;font-size:0;background:#c05a4d;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:44px 48px 8px;">
                <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c79a5b;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">
                  Thankful
                </p>
                <p style="margin:16px 0 0;font-size:26px;line-height:1.25;color:#3d322c;">
                  ${heading}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 48px 12px;color:#4a3d36;font-size:16px;line-height:1.75;text-align:center;">
                <p style="margin:0;">${message}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 48px 44px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background:#c05a4d;border-radius:999px;">
                      <a href="/"
                        style="display:inline-block;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fffdf9;text-decoration:none;">
                        Back to Thankful
                      </a>
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

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

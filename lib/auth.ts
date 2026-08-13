import { betterAuth } from "better-auth"
import { pool } from "@/lib/auth-pool"
import { sendPasswordResetEmail } from "@/lib/email"

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Reset links stay valid for one hour, then require a fresh request.
    resetPasswordTokenExpiresIn: 60 * 60,
    // Better Auth calls this when a user requests a reset. `url` already routes
    // through Better Auth's verification endpoint and then to our
    // /reset-password page with the token attached, so we email it as-is.
    sendResetPassword: async ({ user, url }) => {
      const result = await sendPasswordResetEmail({
        to: user.email,
        url,
        name: user.name,
      })
      if (!result.ok) {
        // Surface delivery problems in server logs; never leak details to the
        // client (that would reveal whether an account exists).
        console.error("[v0] password reset email failed:", result.error)
      }
    },
  },
  // To enable Google sign-in later:
  // 1. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the project env vars.
  // 2. Uncomment the block below.
  // 3. Add a "Continue with Google" button that calls
  //    authClient.signIn.social({ provider: "google" }).
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID as string,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  //   },
  // },
  trustedOrigins: [
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    // Local dev + v0 preview. The v0 preview serves the app on localhost and
    // renders it in a cross-origin iframe whose exact origin isn't exposed via
    // env vars, so in development we accept any origin. Production stays locked
    // to the explicit URLs above.
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "https://localhost:3000", "*"]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // In dev (v0 preview iframe), force cross-site cookies so the
          // session cookie is stored by the browser.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})

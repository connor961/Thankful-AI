import "server-only"

import { sql } from "@/lib/db"

type RoleRow = { role: string | null }

/**
 * Returns true when the given user has the "admin" role. Admins are used for
 * internal testing and live demos: they get full plan entitlements (see
 * getUsage in lib/billing.ts) without going through Stripe checkout.
 *
 * This reads the `role` column on the Better Auth `user` table. The lookup is
 * cheap and safe to call from server actions and route handlers; it never
 * throws for a missing user (returns false instead) so callers can treat a
 * non-admin and an unknown user identically.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const rows = (await sql`
      SELECT role FROM public."user" WHERE id = ${userId} LIMIT 1
    `) as RoleRow[]
    return rows[0]?.role === "admin"
  } catch {
    // Fail closed: if the role lookup errors, treat the user as a normal user
    // rather than accidentally granting elevated access.
    return false
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { EVENT_PASS } from "@/lib/plans"

/**
 * Promotes or demotes a user's admin role. Admins get full plan entitlements
 * (see getUsage) without Stripe, so this is a privileged action — every call is
 * gated by requireAdmin(), and an admin cannot demote themselves (prevents
 * accidentally locking the whole team out of the admin surface).
 */
export async function setAdminRole(
  targetUserId: string,
  makeAdmin: boolean,
): Promise<{ ok: true }> {
  const adminId = await requireAdmin()

  if (targetUserId === adminId && !makeAdmin) {
    throw new Error("You can't remove your own admin access.")
  }

  await sql`
    UPDATE "user"
    SET role = ${makeAdmin ? "admin" : null}, "updatedAt" = now()
    WHERE id = ${targetUserId}
  `

  revalidatePath("/admin")
  revalidatePath(`/admin/users/${targetUserId}`)
  return { ok: true }
}

/**
 * Grants a complimentary Event Pass to a user (support gesture, giveaway, or
 * make-good). Uses a synthetic, deterministic session id so repeated clicks are
 * idempotent and never stack multiple free passes onto the same account.
 */
export async function compEventPass(targetUserId: string): Promise<{ ok: true }> {
  await requireAdmin()

  const compId = `comp_${targetUserId}`

  await sql`
    INSERT INTO event_passes (user_id, stripe_session_id, sends_total, sends_used, status)
    VALUES (${targetUserId}, ${compId}, ${EVENT_PASS.sends}, 0, 'active')
    ON CONFLICT (stripe_session_id) DO NOTHING
  `

  revalidatePath("/admin")
  revalidatePath(`/admin/users/${targetUserId}`)
  return { ok: true }
}

/**
 * Toggles a user's marketing/lifecycle email opt-out. Lets an admin honor a
 * "please stop emailing me" request, or opt a user back in if they were
 * removed by mistake. Insert/delete on the opt-out table is idempotent.
 */
export async function setEmailOptOut(
  targetUserId: string,
  optedOut: boolean,
): Promise<{ ok: true }> {
  await requireAdmin()

  if (optedOut) {
    await sql`
      INSERT INTO email_opt_out (user_id) VALUES (${targetUserId})
      ON CONFLICT (user_id) DO NOTHING
    `
  } else {
    await sql`DELETE FROM email_opt_out WHERE user_id = ${targetUserId}`
  }

  revalidatePath("/admin")
  revalidatePath(`/admin/users/${targetUserId}`)
  return { ok: true }
}

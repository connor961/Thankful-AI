"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { getUserId } from "@/lib/session"

/**
 * One-time migration hook: when the very first account is created, assign all
 * pre-existing owner-less events (user_id IS NULL) to that user so the data
 * that existed before auth was added isn't lost.
 *
 * Safe to call on every sign-up: it only claims orphan events when the current
 * user is the only user in the system, so later signups never inherit them.
 */
export async function claimOrphanEventsIfFirstUser(): Promise<number> {
  const userId = await getUserId()

  const countRows = (await sql`SELECT COUNT(*)::int AS n FROM "user"`) as {
    n: number
  }[]
  const userCount = countRows[0]?.n ?? 0
  if (userCount !== 1) return 0

  const claimed = (await sql`
    UPDATE events SET user_id = ${userId}
    WHERE user_id IS NULL
    RETURNING id
  `) as { id: string }[]

  if (claimed.length > 0) revalidatePath("/")
  return claimed.length
}

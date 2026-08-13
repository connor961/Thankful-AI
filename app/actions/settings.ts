"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { getUserId } from "@/lib/session"
import type { UserSettings } from "@/lib/types"

export type ReturnAddressInput = {
  return_name: string
  return_line1: string
  return_line2: string
  return_city: string
  return_state: string
  return_postal_code: string
  return_country: string
}

const EMPTY: UserSettings = {
  user_id: "",
  return_name: "",
  return_line1: "",
  return_line2: "",
  return_city: "",
  return_state: "",
  return_postal_code: "",
  return_country: "",
  created_at: "",
  updated_at: "",
}

/** Returns the current user's settings, or empty defaults if none saved yet. */
export async function getUserSettings(): Promise<UserSettings> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT * FROM user_settings WHERE user_id = ${userId}
  `) as UserSettings[]
  return rows[0] ?? { ...EMPTY, user_id: userId }
}

/**
 * Upserts the user's return address. A single row per user keyed on user_id,
 * so saving repeatedly just overwrites the stored address.
 */
export async function saveReturnAddress(
  input: ReturnAddressInput,
): Promise<void> {
  const userId = await getUserId()
  await sql`
    INSERT INTO user_settings (
      user_id, return_name, return_line1, return_line2,
      return_city, return_state, return_postal_code, return_country, updated_at
    )
    VALUES (
      ${userId},
      ${input.return_name.trim()},
      ${input.return_line1.trim()},
      ${input.return_line2.trim()},
      ${input.return_city.trim()},
      ${input.return_state.trim()},
      ${input.return_postal_code.trim()},
      ${input.return_country.trim()},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      return_name = EXCLUDED.return_name,
      return_line1 = EXCLUDED.return_line1,
      return_line2 = EXCLUDED.return_line2,
      return_city = EXCLUDED.return_city,
      return_state = EXCLUDED.return_state,
      return_postal_code = EXCLUDED.return_postal_code,
      return_country = EXCLUDED.return_country,
      updated_at = now()
  `
  revalidatePath("/settings")
}

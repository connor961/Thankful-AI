import "server-only"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"

/** Returns the current session, or null when signed out. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Returns the signed-in user's id, or null when signed out. */
export async function getOptionalUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.user?.id ?? null
}

/** Returns the signed-in user's id, or throws when signed out. */
export async function getUserId(): Promise<string> {
  const userId = await getOptionalUserId()
  if (!userId) throw new Error("Unauthorized")
  return userId
}

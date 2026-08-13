import "server-only"

import { getOptionalUserId } from "@/lib/session"
import { getUsage } from "@/lib/billing"
import type { HeaderUsage } from "@/components/site-header"
import type { PlanId } from "@/lib/plans"

/**
 * Assembles the compact usage summary shown in the header. Returns null when
 * signed out so the header simply omits the indicator.
 */
export async function getHeaderUsage(): Promise<HeaderUsage | null> {
  const userId = await getOptionalUserId()
  if (!userId) return null

  const usage = await getUsage(userId)
  return {
    planId: usage.plan.id as PlanId,
    planName: usage.plan.name,
    used: usage.used,
    limit: usage.limit,
    unlimited: usage.unlimited,
  }
}

import "server-only"

import { sql } from "@/lib/db"
import { getPlan, type PlanId } from "@/lib/plans"
import { getUsage } from "@/lib/billing"

/**
 * All admin analytics run as a set of small, independent aggregate queries so
 * each section of the dashboard can be reasoned about (and changed) on its own.
 * Everything here is read-only; mutating admin actions live in
 * app/actions/admin.ts. Callers MUST gate access with requireAdmin() first —
 * these functions do not re-check the role themselves.
 */

export type AdminOverview = {
  totalUsers: number
  newUsers7d: number
  newUsers30d: number
  activatedUsers: number
  activationRate: number
  totalEvents: number
  totalNotes: number
  notesSent: number
  notesSent7d: number
}

/** Top-line KPIs for the overview cards. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const rows = (await sql`
    SELECT
      (SELECT COUNT(*) FROM "user")::int AS total_users,
      (SELECT COUNT(*) FROM "user" WHERE "createdAt" >= now() - interval '7 days')::int AS new_users_7d,
      (SELECT COUNT(*) FROM "user" WHERE "createdAt" >= now() - interval '30 days')::int AS new_users_30d,
      (SELECT COUNT(DISTINCT user_id) FROM note_sends)::int AS activated_users,
      (SELECT COUNT(*) FROM events WHERE is_sample = false)::int AS total_events,
      (SELECT COUNT(*) FROM notes)::int AS total_notes,
      (SELECT COUNT(*) FROM note_sends)::int AS notes_sent,
      (SELECT COUNT(*) FROM note_sends WHERE sent_at >= now() - interval '7 days')::int AS notes_sent_7d
  `) as {
    total_users: number
    new_users_7d: number
    new_users_30d: number
    activated_users: number
    total_events: number
    total_notes: number
    notes_sent: number
    notes_sent_7d: number
  }[]

  const r = rows[0]
  const totalUsers = r?.total_users ?? 0
  const activatedUsers = r?.activated_users ?? 0

  return {
    totalUsers,
    newUsers7d: r?.new_users_7d ?? 0,
    newUsers30d: r?.new_users_30d ?? 0,
    activatedUsers,
    activationRate: totalUsers > 0 ? activatedUsers / totalUsers : 0,
    totalEvents: r?.total_events ?? 0,
    totalNotes: r?.total_notes ?? 0,
    notesSent: r?.notes_sent ?? 0,
    notesSent7d: r?.notes_sent_7d ?? 0,
  }
}

export type PlanBreakdownRow = {
  plan: PlanId
  name: string
  count: number
  mrrCents: number
}

export type AdminRevenue = {
  plans: PlanBreakdownRow[]
  payingCustomers: number
  mrrCents: number
  activePasses: number
  passRevenueCents: number
}

/**
 * Revenue picture derived from our own subscription/pass tables (not a live
 * Stripe call, so it's fast and safe to render on every load). MRR is estimated
 * from the plan list price times the count of active/trialing subscribers on
 * each paid plan — a close proxy for the real figure without per-customer
 * proration.
 */
export async function getAdminRevenue(): Promise<AdminRevenue> {
  const subRows = (await sql`
    SELECT plan, COUNT(*)::int AS count
    FROM subscriptions
    WHERE status IN ('active', 'trialing') AND plan <> 'free'
    GROUP BY plan
  `) as { plan: PlanId; count: number }[]

  const plans: PlanBreakdownRow[] = subRows.map((row) => {
    const plan = getPlan(row.plan)
    return {
      plan: row.plan,
      name: plan.name,
      count: row.count,
      mrrCents: plan.priceInCents * row.count,
    }
  })

  const payingCustomers = plans.reduce((sum, p) => sum + p.count, 0)
  const mrrCents = plans.reduce((sum, p) => sum + p.mrrCents, 0)

  const passRows = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_passes,
      COUNT(*)::int AS total_passes
    FROM event_passes
  `) as { active_passes: number; total_passes: number }[]

  return {
    plans: plans.sort((a, b) => b.mrrCents - a.mrrCents),
    payingCustomers,
    mrrCents,
    activePasses: passRows[0]?.active_passes ?? 0,
    // Every pass ever sold at the current one-time price (rough gross proxy).
    passRevenueCents: (passRows[0]?.total_passes ?? 0) * 2900,
  }
}

export type LifecycleFunnel = {
  /** Users who have never sent a note, bucketed by account age. */
  notActivatedByAge: { label: string; count: number }[]
  /** Count of lifecycle emails sent, per step. */
  sentByStep: { step: number; count: number }[]
  optOuts: number
  /** Users who received at least one lifecycle email and then activated. */
  recoveredUsers: number
}

/**
 * The activation-email funnel: how many un-activated users sit in each age
 * bucket the sequence targets, how many emails we've actually sent per step,
 * opt-outs, and how many emailed users later sent their first note (the metric
 * that tells us the sequence is working).
 */
export async function getLifecycleFunnel(): Promise<LifecycleFunnel> {
  const ageRows = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE u."createdAt" >= now() - interval '1 day')::int AS d0,
      COUNT(*) FILTER (WHERE u."createdAt" <  now() - interval '1 day'  AND u."createdAt" >= now() - interval '3 days')::int AS d1_3,
      COUNT(*) FILTER (WHERE u."createdAt" <  now() - interval '3 days' AND u."createdAt" >= now() - interval '7 days')::int AS d3_7,
      COUNT(*) FILTER (WHERE u."createdAt" <  now() - interval '7 days')::int AS d7_plus
    FROM "user" u
    WHERE NOT EXISTS (SELECT 1 FROM note_sends ns WHERE ns.user_id = u.id)
  `) as { d0: number; d1_3: number; d3_7: number; d7_plus: number }[]

  const a = ageRows[0]

  const stepRows = (await sql`
    SELECT step, COUNT(*)::int AS count
    FROM lifecycle_emails
    GROUP BY step
    ORDER BY step
  `) as { step: number; count: number }[]

  const optOutRows = (await sql`SELECT COUNT(*)::int AS count FROM email_opt_out`) as {
    count: number
  }[]

  const recoveredRows = (await sql`
    SELECT COUNT(DISTINCT le.user_id)::int AS count
    FROM lifecycle_emails le
    JOIN note_sends ns ON ns.user_id = le.user_id
  `) as { count: number }[]

  return {
    notActivatedByAge: [
      { label: "< 1 day", count: a?.d0 ?? 0 },
      { label: "1–3 days", count: a?.d1_3 ?? 0 },
      { label: "3–7 days", count: a?.d3_7 ?? 0 },
      { label: "7+ days", count: a?.d7_plus ?? 0 },
    ],
    sentByStep: stepRows,
    optOuts: optOutRows[0]?.count ?? 0,
    recoveredUsers: recoveredRows[0]?.count ?? 0,
  }
}

export type AdminUserRow = {
  id: string
  name: string | null
  email: string
  createdAt: string
  role: string | null
  plan: PlanId
  subStatus: string | null
  notesSent: number
  eventsCount: number
  activated: boolean
  hasActivePass: boolean
  optedOut: boolean
}

/**
 * The most recent users with their key account facts joined in. Capped at a
 * reasonable limit and filterable by a search term (name or email) so the admin
 * table stays fast without pagination machinery for now.
 */
export async function getAdminUsers(search = "", limit = 100): Promise<AdminUserRow[]> {
  const term = `%${search.trim().toLowerCase()}%`
  const hasSearch = search.trim().length > 0

  const rows = (await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u."createdAt" AS created_at,
      u.role,
      COALESCE(s.plan, 'free') AS plan,
      s.status AS sub_status,
      COALESCE(ns.cnt, 0)::int AS notes_sent,
      COALESCE(ev.cnt, 0)::int AS events_count,
      (ns.cnt IS NOT NULL AND ns.cnt > 0) AS activated,
      (ep.cnt IS NOT NULL AND ep.cnt > 0) AS has_active_pass,
      (oo.user_id IS NOT NULL) AS opted_out
    FROM "user" u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM note_sends GROUP BY user_id) ns ON ns.user_id = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM events WHERE is_sample = false GROUP BY user_id) ev ON ev.user_id = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM event_passes WHERE status = 'active' GROUP BY user_id) ep ON ep.user_id = u.id
    LEFT JOIN email_opt_out oo ON oo.user_id = u.id
    WHERE ${hasSearch ? sql`(LOWER(u.email) LIKE ${term} OR LOWER(COALESCE(u.name, '')) LIKE ${term})` : sql`TRUE`}
    ORDER BY u."createdAt" DESC
    LIMIT ${limit}
  `) as {
    id: string
    name: string | null
    email: string
    created_at: string
    role: string | null
    plan: PlanId
    sub_status: string | null
    notes_sent: number
    events_count: number
    activated: boolean
    has_active_pass: boolean
    opted_out: boolean
  }[]

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    createdAt: r.created_at,
    role: r.role,
    plan: r.plan,
    subStatus: r.sub_status,
    notesSent: r.notes_sent,
    eventsCount: r.events_count,
    activated: r.activated,
    hasActivePass: r.has_active_pass,
    optedOut: r.opted_out,
  }))
}

export type AdminUserEvent = {
  id: string
  name: string
  eventType: string
  eventDate: string | null
  isSample: boolean
  createdAt: string
  notesTotal: number
  notesSent: number
}

export type AdminUserPass = {
  id: string
  sendsTotal: number
  sendsUsed: number
  status: string
  createdAt: string
  isComp: boolean
}

export type AdminUserSubscription = {
  plan: PlanId
  planName: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
}

export type AdminUserActivityItem = {
  type: "note_sent" | "lifecycle_email"
  at: string
  label: string
}

export type AdminUserDetail = {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  role: string | null
  createdAt: string
  optedOut: boolean
  activated: boolean
  notesSentTotal: number
  usage: {
    used: number
    limit: number
    unlimited: boolean
    lifetime: boolean
    canPrint: boolean
    planName: string
  }
  subscription: AdminUserSubscription | null
  passes: AdminUserPass[]
  events: AdminUserEvent[]
  activity: AdminUserActivityItem[]
}

/**
 * The full 360° view of one account for support and moderation: profile,
 * billing (subscription + passes), every event with its note progress, and a
 * merged activity timeline of note sends and lifecycle emails. Returns null
 * when the id doesn't exist so the page can 404 cleanly. Read-only; callers
 * MUST gate with requireAdmin() first.
 */
export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const userRows = (await sql`
    SELECT u.id, u.name, u.email, u."emailVerified" AS email_verified,
           u.role, u."createdAt" AS created_at,
           (oo.user_id IS NOT NULL) AS opted_out
    FROM "user" u
    LEFT JOIN email_opt_out oo ON oo.user_id = u.id
    WHERE u.id = ${userId}
  `) as {
    id: string
    name: string | null
    email: string
    email_verified: boolean
    role: string | null
    created_at: string
    opted_out: boolean
  }[]

  const u = userRows[0]
  if (!u) return null

  const [subRowsRaw, passRowsRaw, eventRowsRaw, sendRowsRaw, lifecycleRowsRaw, usage] =
    await Promise.all([
      sql`
        SELECT plan, status, current_period_end, cancel_at_period_end, stripe_customer_id
        FROM subscriptions WHERE user_id = ${userId}
      `,
      sql`
        SELECT id, sends_total, sends_used, status, created_at, stripe_session_id
        FROM event_passes WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `,
      sql`
        SELECT e.id, e.name, e.event_type, e.event_date, e.is_sample, e.created_at,
               COALESCE(n.total, 0)::int AS notes_total,
               COALESCE(n.sent, 0)::int AS notes_sent
        FROM events e
        LEFT JOIN (
          SELECT event_id,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE status = 'sent') AS sent
          FROM notes GROUP BY event_id
        ) n ON n.event_id = e.id
        WHERE e.user_id = ${userId}
        ORDER BY e.created_at DESC
      `,
      sql`
        SELECT ns.sent_at, e.name AS event_name
        FROM note_sends ns
        LEFT JOIN notes nt ON nt.id = ns.note_id
        LEFT JOIN events e ON e.id = nt.event_id
        WHERE ns.user_id = ${userId}
        ORDER BY ns.sent_at DESC
        LIMIT 25
      `,
      sql`
        SELECT step, sent_at FROM lifecycle_emails
        WHERE user_id = ${userId} ORDER BY sent_at DESC
      `,
      getUsage(userId),
    ])

  const subRows = subRowsRaw as {
    plan: PlanId
    status: string
    current_period_end: string | null
    cancel_at_period_end: boolean
    stripe_customer_id: string | null
  }[]
  const passRows = passRowsRaw as {
    id: string
    sends_total: number
    sends_used: number
    status: string
    created_at: string
    stripe_session_id: string
  }[]
  const eventRows = eventRowsRaw as {
    id: string
    name: string
    event_type: string
    event_date: string | null
    is_sample: boolean
    created_at: string
    notes_total: number
    notes_sent: number
  }[]
  const sendRows = sendRowsRaw as {
    sent_at: string
    event_name: string | null
  }[]
  const lifecycleRows = lifecycleRowsRaw as {
    step: number
    sent_at: string
  }[]

  const sub = subRows[0]
  const subscription: AdminUserSubscription | null = sub
    ? {
        plan: sub.plan,
        planName: getPlan(sub.plan).name,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        stripeCustomerId: sub.stripe_customer_id,
      }
    : null

  const activity: AdminUserActivityItem[] = [
    ...sendRows.map((r) => ({
      type: "note_sent" as const,
      at: r.sent_at,
      label: r.event_name
        ? `Sent a thank-you note for “${r.event_name}”`
        : "Sent a thank-you note",
    })),
    ...lifecycleRows.map((r) => ({
      type: "lifecycle_email" as const,
      at: r.sent_at,
      label: `Received activation email (day ${r.step})`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30)

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.email_verified,
    role: u.role,
    createdAt: u.created_at,
    optedOut: u.opted_out,
    activated: sendRows.length > 0,
    notesSentTotal: sendRows.length,
    usage: {
      used: usage.used,
      limit: usage.limit ?? 0,
      unlimited: usage.unlimited,
      lifetime: usage.lifetime,
      canPrint: usage.canPrint,
      planName: usage.plan.name,
    },
    subscription,
    passes: passRows.map((p) => ({
      id: p.id,
      sendsTotal: p.sends_total,
      sendsUsed: p.sends_used,
      status: p.status,
      createdAt: p.created_at,
      isComp: p.stripe_session_id.startsWith("comp_"),
    })),
    events: eventRows.map((e) => ({
      id: e.id,
      name: e.name,
      eventType: e.event_type,
      eventDate: e.event_date,
      isSample: e.is_sample,
      createdAt: e.created_at,
      notesTotal: e.notes_total,
      notesSent: e.notes_sent,
    })),
    activity,
  }
}

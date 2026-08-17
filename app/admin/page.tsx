import { notFound, redirect } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { isAdmin } from "@/lib/admin"
import {
  getAdminOverview,
  getAdminRevenue,
  getLifecycleFunnel,
  getAdminUsers,
} from "@/lib/admin-data"
import { AdminOverviewCards } from "@/components/admin/admin-overview"
import { AdminRevenue } from "@/components/admin/admin-revenue"
import { AdminLifecycle } from "@/components/admin/admin-lifecycle"
import { AdminUsersTable } from "@/components/admin/admin-users-table"

export const metadata = {
  title: "Admin | Thankful AI",
  robots: { index: false, follow: false },
}

// Always render fresh: admin numbers should never be served from a stale cache.
export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  // Non-admins get a 404 rather than a redirect, so the admin surface's
  // existence isn't advertised to normal users.
  if (!(await isAdmin(session.user.id))) notFound()

  const [headerUsage, overview, revenue, funnel, users] = await Promise.all([
    getHeaderUsage(),
    getAdminOverview(),
    getAdminRevenue(),
    getLifecycleFunnel(),
    getAdminUsers(),
  ])

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} usage={headerUsage} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="font-serif text-4xl text-foreground text-balance">
            Admin
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-pretty">
            Growth, revenue, activation, and user management for Thankful AI.
          </p>
        </header>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Overview
            </h2>
            <AdminOverviewCards overview={overview} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <AdminRevenue revenue={revenue} />
            <AdminLifecycle funnel={funnel} />
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Users
            </h2>
            <AdminUsersTable
              initialUsers={users}
              currentAdminId={session.user.id}
            />
          </section>
        </div>
      </main>
    </div>
  )
}

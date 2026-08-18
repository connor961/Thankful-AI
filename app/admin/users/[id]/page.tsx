import { notFound, redirect } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { isAdmin } from "@/lib/admin"
import { getAdminUserDetail } from "@/lib/admin-data"
import { AdminUserDetail } from "@/components/admin/admin-user-detail"

export const metadata = {
  title: "User detail | Thankful AI",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  if (!(await isAdmin(session.user.id))) notFound()

  const { id } = await params

  const [headerUsage, detail] = await Promise.all([
    getHeaderUsage(),
    getAdminUserDetail(id),
  ])

  if (!detail) notFound()

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} usage={headerUsage} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <AdminUserDetail detail={detail} currentAdminId={session.user.id} />
      </main>
    </div>
  )
}

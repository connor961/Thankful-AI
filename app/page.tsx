import { getEvents } from "@/app/actions/events"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { LandingPage } from "@/components/landing/landing-page"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export default async function HomePage() {
  const session = await getSession()

  // Logged-out visitors get the public marketing landing page; signed-in users
  // get their dashboard at the same URL.
  if (!session?.user) {
    return <LandingPage />
  }

  const [events, usage] = await Promise.all([getEvents(), getHeaderUsage()])

  return <DashboardHome user={session.user} usage={usage} events={events} />
}

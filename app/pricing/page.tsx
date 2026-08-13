import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { PricingGrid } from "@/components/billing/pricing-grid"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { getSubscription } from "@/lib/billing"
import { getPlan } from "@/lib/plans"

export const metadata = {
  title: "Pricing",
  description:
    "Monthly plans for year-round celebrations, plus a one-time Event Pass for a single big event like a wedding or baby shower.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Thankful",
    description:
      "Monthly plans for year-round celebrations, plus a one-time Event Pass for a single big event like a wedding or baby shower.",
    url: "/pricing",
  },
}

export default async function PricingPage() {
  const session = await getSession()

  let currentPlan: ReturnType<typeof getPlan>["id"] | null = null
  let headerUsage = null
  if (session?.user) {
    const [sub, usage] = await Promise.all([
      getSubscription(session.user.id),
      getHeaderUsage(),
    ])
    currentPlan = getPlan(sub.plan).id
    headerUsage = usage
  }

  return (
    <div className="min-h-svh">
      <SiteHeader user={session?.user ?? null} usage={headerUsage} />
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Pricing
          </p>
          <h1 className="mt-3 font-serif text-4xl text-foreground text-balance sm:text-5xl">
            A plan for every kind of thank-you
          </h1>
          <p className="mt-4 text-muted-foreground text-pretty">
            Celebrating all year? Subscribe monthly. Have one big event like a
            wedding or baby shower? Grab a one-time Event Pass and pay just
            once. Every option includes AI note generation and email delivery.
          </p>
        </header>

        <PricingGrid isAuthed={!!session?.user} currentPlan={currentPlan} />

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/billing" className="font-medium text-primary underline-offset-4 hover:underline">
            Manage your plan
          </Link>
          .
        </p>
      </main>
    </div>
  )
}

import Link from "next/link"
import { Gift, Mail, Sparkles, Plus, ArrowRight } from "lucide-react"
import type { EventWithStats } from "@/app/actions/events"
import { SiteHeader, type HeaderUsage } from "@/components/site-header"
import type { SessionUser } from "@/components/user-menu"
import { UpgradeDialog } from "@/components/billing/upgrade-dialog"
import { EventCard } from "@/components/dashboard/event-card"
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome"
import { Button } from "@/components/ui/button"

export function DashboardHome({
  user,
  usage,
  events,
}: {
  user: SessionUser
  usage: HeaderUsage | null
  events: EventWithStats[]
}) {
  const totals = events.reduce(
    (acc, e) => {
      acc.gifts += e.gift_count
      acc.ready += e.approved_count + e.sent_count
      acc.sent += e.sent_count
      return acc
    },
    { gifts: 0, ready: 0, sent: 0 },
  )

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} usage={usage} />
      {usage ? <UpgradeDialog currentPlan={usage.planId} /> : null}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {events.length === 0 ? (
          <DashboardWelcome user={user} />
        ) : (
          <>
            <section className="mb-10 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  Gratitude, your way
                </span>
                <h1 className="max-w-2xl font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                  Every gift deserves a heartfelt thank-you.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
                  Record it, upload a list, or type it in yourself. Thankful
                  keeps track of every gift, who gave it, and how you reacted
                  &mdash; then helps you say thanks in your own voice, however
                  hands-on you want to be.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/events/new" />}
                >
                  <Plus data-icon="inline-start" />
                  Create an event
                </Button>
              </div>
            </section>

            <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Events" value={events.length} icon={Sparkles} />
              <StatTile
                label="Gifts tracked"
                value={totals.gifts}
                icon={Gift}
              />
              <StatTile label="Notes ready" value={totals.ready} icon={Mail} />
              <StatTile
                label="Notes sent"
                value={totals.sent}
                icon={ArrowRight}
              />
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-semibold">
                  Your events
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <Icon className="size-5 text-primary" />
      <div className="flex flex-col">
        <span className="font-serif text-2xl font-semibold leading-none">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

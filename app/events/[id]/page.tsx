import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { UpgradeDialog } from "@/components/billing/upgrade-dialog"
import { EventWorkspace } from "@/components/event/event-workspace"
import { getEvent, getGiftsWithNotes } from "@/app/actions/events"
import {
  getContactEmailMap,
  getContactNames,
  getContactAddressMap,
} from "@/app/actions/contacts"
import { getUserSettings } from "@/app/actions/settings"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { hasMailingAddress } from "@/lib/format"
import { outboundSenderAddress } from "@/lib/email"
import type { LabelAddress } from "@/lib/types"

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const [gifts, contactEmails, contactNames, contactAddresses, settings, usage] =
    await Promise.all([
      getGiftsWithNotes(id),
      getContactEmailMap(),
      getContactNames(),
      getContactAddressMap(),
      getUserSettings(),
      getHeaderUsage(),
    ])

  // Map the saved return address into the flat label shape, or null if unset.
  const returnAddressFields = {
    address_line1: settings.return_line1,
    address_line2: settings.return_line2,
    city: settings.return_city,
    state: settings.return_state,
    postal_code: settings.return_postal_code,
    country: settings.return_country,
  }
  const returnAddress: LabelAddress | null = hasMailingAddress(
    returnAddressFields,
  )
    ? {
        name: settings.return_name,
        line1: settings.return_line1,
        line2: settings.return_line2,
        city: settings.return_city,
        state: settings.return_state,
        postal_code: settings.return_postal_code,
        country: settings.return_country,
      }
    : null

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} usage={usage} />
      {usage ? <UpgradeDialog currentPlan={usage.planId} /> : null}
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All events
        </Link>
        <EventWorkspace
          event={event}
          items={gifts}
          contactEmails={contactEmails}
          contactNames={contactNames}
          contactAddresses={contactAddresses}
          returnAddress={returnAddress}
          senderAddress={outboundSenderAddress()}
          planId={usage?.planId}
          canPrint={usage?.canPrint ?? false}
        />
      </main>
    </div>
  )
}

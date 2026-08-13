import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ContactsView } from "@/components/contacts/contacts-view"
import { getContacts } from "@/app/actions/contacts"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"

export const metadata = {
  title: "Contacts | Thankful AI",
  description: "Your address book of gift givers and note recipients.",
}

export default async function ContactsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const [contacts, usage] = await Promise.all([getContacts(), getHeaderUsage()])

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} usage={usage} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <ContactsView contacts={contacts} />
      </main>
    </div>
  )
}

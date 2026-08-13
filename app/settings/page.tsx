import { redirect } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { ReturnAddressForm } from "@/components/settings/return-address-form"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { getUserSettings } from "@/app/actions/settings"

export const metadata = {
  title: "Settings | Thankful AI",
  description: "Manage your account and your return address for printed cards.",
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const [headerUsage, settings] = await Promise.all([
    getHeaderUsage(),
    getUserSettings(),
  ])

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} usage={headerUsage} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="font-serif text-4xl text-foreground text-balance">
            Settings
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-pretty">
            Your return address is saved here so it&apos;s ready to print on
            cards later &mdash; enter it once and forget it.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-2xl text-foreground">
              Return address
            </h2>
            <p className="text-sm text-muted-foreground text-pretty">
              This is you &mdash; the sender. We&apos;ll use it as the return
              address when you print cards and envelopes.
            </p>
          </div>
          <ReturnAddressForm settings={settings} />
        </section>
      </main>
    </div>
  )
}

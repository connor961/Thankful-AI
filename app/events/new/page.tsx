import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CreateEventForm } from "@/components/event/create-event-form"
import { getSession } from "@/lib/session"
import { Card, CardContent } from "@/components/ui/card"

export default async function NewEventPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  return (
    <div className="min-h-screen">
      <SiteHeader showNewEvent={false} user={session.user} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to events
        </Link>
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance">
            Create an event
          </h1>
          <p className="text-muted-foreground text-pretty">
            Tell us about your celebration. We&apos;ll use these details to write
            notes that sound like you.
          </p>
        </div>
        <Card>
          <CardContent>
            <CreateEventForm />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

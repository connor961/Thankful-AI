import Link from "next/link"
import {
  Sparkles,
  Mic,
  PenLine,
  Send,
  ArrowRight,
  Clock,
} from "lucide-react"
import type { SessionUser } from "@/components/user-menu"
import { Button } from "@/components/ui/button"

/**
 * First-run experience shown on the dashboard when a user has no events yet.
 * Replaces the generic marketing hero + bare "No events" empty state with a
 * warm, personalized welcome that explains the three-step flow and points at
 * a single clear next action.
 */

const STEPS = [
  {
    icon: Mic,
    title: "Capture your gifts",
    body: "Record the gift-opening, upload a video or audio clip, paste a transcript, or just type them in. Thankful pulls out each gift, who gave it, and your reaction.",
    accent: "Record · Upload · Type",
  },
  {
    icon: PenLine,
    title: "Get your words",
    body: "Every gift gets a heartfelt draft in the tone you choose. Let the AI write it, shape it together, or write it yourself — you're always in control.",
    accent: "AI · Hybrid · Yourself",
  },
  {
    icon: Send,
    title: "Send it your way",
    body: "Email a beautifully designed note, print a fold card or mailable postcard, or run a sheet of address labels. Mark each as sent and watch your list shrink.",
    accent: "Email · Print · Mail",
  },
]

export function DashboardWelcome({ user }: { user: SessionUser }) {
  const firstName = user.name?.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Welcome to Thankful
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="max-w-2xl font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {firstName ? `Welcome, ${firstName}.` : "Welcome."} Let&apos;s send
            your first thank-you.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
            Start by creating an event — a wedding, shower, birthday, or any
            occasion with gifts to thank people for. From there, capturing your
            gifts and drafting notes takes just a few minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/events/new" />}
          >
            Create your first event
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/how-to" />}
          >
            See how it works
          </Button>
        </div>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" />
          About 2 minutes to set up your first event.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-xl font-semibold text-muted-foreground">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon className="size-5 text-primary" />
                </span>
                <span
                  aria-hidden="true"
                  className="font-serif text-3xl font-semibold text-muted-foreground/25"
                >
                  {i + 1}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-lg font-semibold">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {step.body}
                </p>
              </div>
              <span className="mt-auto text-xs font-medium tracking-wide text-primary">
                {step.accent}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

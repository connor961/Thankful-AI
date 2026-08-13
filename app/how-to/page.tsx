import Link from "next/link"
import {
  Sparkles,
  Gift,
  Mail,
  Printer,
  Users,
  Palette,
  Mic,
  FileText,
  PenLine,
  Send,
  Heart,
  ArrowRight,
  CalendarPlus,
  ListChecks,
  MessageSquareQuote,
} from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"

export const metadata = {
  title: "How it works",
  description:
    "A quick guide to Thankful: turn a recording, transcript, or gift list into heartfelt, personalized thank-you notes you can email or print as a fold card.",
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: "How it works | Thankful",
    description:
      "A quick guide to Thankful: turn a recording, transcript, or gift list into heartfelt, personalized thank-you notes you can email or print as a fold card.",
    url: "/how-to",
  },
}

const STEPS = [
  {
    icon: CalendarPlus,
    title: "Create an event",
    body: "Name the occasion — a wedding, baby shower, birthday, or holiday. Add the date, who the notes are from, and a short bit of context so every note sounds like you.",
  },
  {
    icon: Gift,
    title: "Add your gifts",
    body: "Upload a recording or transcript from the gift opening and Thankful AI finds each gift, who gave it, and how you reacted. No recording? Add gifts manually in a few taps.",
  },
  {
    icon: PenLine,
    title: "Review & personalize",
    body: "Each gift gets a drafted note. Read them over, tweak the wording, or regenerate with a different tone until it feels right. You are always in control of what goes out.",
  },
  {
    icon: Send,
    title: "Send or print",
    body: "Email a note straight to each guest in the design you picked, or print it as a fold-up greeting card with a handwritten look. Mark notes as sent and watch your list shrink.",
  },
]

const FEATURES = [
  {
    icon: MessageSquareQuote,
    title: "Tone & context",
    body: "Choose a tone — warm, playful, formal, and more — and add event context so notes reference the moment, not just the gift.",
  },
  {
    icon: Palette,
    title: "Email designs",
    body: "Pick Classic, Modern, or Playful. Your choice styles every emailed note so it matches the spirit of the celebration.",
  },
  {
    icon: Printer,
    title: "Printable fold cards",
    body: "Prefer paper? Print any note as a quarter-fold greeting card with a handwriting font inside — fold twice and it is ready to hand out.",
  },
  {
    icon: Users,
    title: "Contacts",
    body: "Save guests once and Thankful AI suggests their email the next time their name comes up, so sending is a single click.",
  },
]

const FAQS = [
  {
    q: "What can I upload to capture gifts?",
    a: "A recording or a written transcript from the gift opening works best — Thankful AI reads it and pulls out each gift, the giver, and your reaction. You can also skip uploading and enter gifts by hand.",
  },
  {
    q: "Will the notes actually sound like me?",
    a: "Yes. The tone you pick and the context you add shape every note, and you can edit or regenerate any draft before it is sent. Nothing goes out without your review.",
  },
  {
    q: "Can I send by email and print cards?",
    a: "Both. Email delivers the note in your chosen design, and the print option lays the same note out as a fold-up card with a handwritten style for a personal, physical touch.",
  },
  {
    q: "Who does the email come from?",
    a: "Notes sent from within Thankful AI are delivered by thankyou@capstoneconsulting.co, so recipients see a consistent, branded sender. If you would rather the note come from your own email address, choose \u201cOpen in mail app instead\u201d in the send dialog — it opens a pre-filled draft in your mail app so you can send it from your personal account.",
  },
  {
    q: "How many notes can I create?",
    a: "Every plan includes AI drafting and email delivery, with a monthly notes-sent limit that scales with your plan. Check the pricing page for the details and one-time Event Pass option.",
  },
]

export default async function HowToPage() {
  const session = await getSession()
  const usage = session?.user ? await getHeaderUsage() : null
  const signedIn = Boolean(session?.user)

  return (
    <div className="min-h-svh">
      <SiteHeader user={session?.user ?? null} usage={usage} />
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <header className="mx-auto mb-16 max-w-2xl text-center">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Guide
          </span>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            How to use Thankful AI
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            Thankful AI turns the memory of your celebration into heartfelt,
            personalized thank-you notes — ready to email or print — in a
            fraction of the time it takes to write them by hand.
          </p>
        </header>

        {/* Overview value props */}
        <section className="mb-20 grid gap-4 sm:grid-cols-3">
          <OverviewCard
            icon={Mic}
            title="Capture the moment"
            body="Upload a recording or transcript and let the AI find every gift and giver for you."
          />
          <OverviewCard
            icon={Sparkles}
            title="Draft in seconds"
            body="Get a thoughtful, specific note for each gift — written in the tone you choose."
          />
          <OverviewCard
            icon={Mail}
            title="Send with ease"
            body="Deliver by email in a design you love, or print a fold card to give by hand."
          />
        </section>

        {/* Steps */}
        <section className="mb-20">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Four steps to done
            </h2>
            <p className="max-w-2xl text-muted-foreground text-pretty">
              From celebration to sent — here is the whole flow.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl border bg-card p-6"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <step.icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-xl font-semibold leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="mb-20">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Make every note yours
            </h2>
            <p className="max-w-2xl text-muted-foreground text-pretty">
              Small touches that make an AI-drafted note feel unmistakably
              personal.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-2xl border bg-card p-6"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <f.icon className="size-5 text-primary" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-lg font-semibold leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Good to know
            </h2>
          </div>
          <div className="grid gap-4">
            {FAQS.map((item) => (
              <div key={item.q} className="rounded-2xl border bg-card p-6">
                <h3 className="flex items-start gap-2 font-medium text-foreground">
                  <ListChecks className="mt-0.5 size-5 shrink-0 text-primary" />
                  {item.q}
                </h3>
                <p className="mt-2 pl-7 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-5 rounded-3xl border bg-secondary/50 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Heart className="size-6 fill-current" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-balance">
              Ready to say thank you?
            </h2>
            <p className="mx-auto max-w-md text-muted-foreground text-pretty">
              Create your first event and see Thankful AI draft your notes in
              seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={signedIn ? "/events/new" : "/sign-up"} />}
            >
              <FileText data-icon="inline-start" />
              {signedIn ? "Create an event" : "Get started free"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/pricing" />}
            >
              View pricing
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

function OverviewCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
      <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
        <Icon className="size-5 text-primary" />
      </span>
      <h3 className="font-serif text-lg font-semibold leading-tight">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        {body}
      </p>
    </div>
  )
}

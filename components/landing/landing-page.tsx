import Link from "next/link"
import {
  Mic,
  Upload,
  Type,
  Sparkles,
  PenLine,
  Blend,
  Users,
  Printer,
  Tag,
  ListChecks,
  Heart,
  ArrowRight,
  Check,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/landing/hero"
import { Button } from "@/components/ui/button"
import { SITE_NAME, SITE_DESCRIPTION, siteUrl } from "@/lib/site"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <StructuredData />
      <SiteHeader />
      <main>
        <Hero />
        <Philosophy />
        <CaptureFork />
        <NotesFork />
        <MoreWays />
        <HowItWorks />
        <Voices />
        <FinalCta />
      </main>
    </div>
  )
}

/* -------------------------- Structured data ---------------------------- */

// JSON-LD for rich results: describes the site and the app itself, plus the
// two ways to pay so search engines understand the pricing model. Rendered only
// on the public landing page (logged-out visitors).
function StructuredData() {
  const base = siteUrl()
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "Capstone Consulting",
        url: base,
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        url: `${base}/`,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          offerCount: "4",
          url: `${base}/pricing`,
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // Static, server-rendered object — safe to inject.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}

/* ---------------------------- Philosophy ------------------------------- */

function Philosophy() {
  return (
    <section className="border-y bg-card/40">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <Heart className="mx-auto mb-6 size-8 text-primary" />
        <p className="font-serif text-2xl font-medium leading-snug text-balance sm:text-3xl">
          A thank-you note matters because you remembered someone &mdash; not
          because it was hard to write.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
          Thankful isn&apos;t here to replace the sentiment or manufacture
          gratitude. It preserves the context &mdash; the gift, the giver, the
          moment &mdash; and removes the friction between feeling grateful and
          actually saying it. The personal thought stays yours. Always.
        </p>
      </div>
    </section>
  )
}

/* --------------------------- Capture fork ------------------------------ */

function CaptureFork() {
  return (
    <ForkSection
      eyebrow="Step 1 — Capture"
      title="Get your gifts in, however you like."
      subtitle="Opening presents in a rush? Already have a list? Prefer to type as you go? Every path leads to the same place."
      options={[
        {
          icon: Mic,
          title: "Record & transcribe",
          body: "Record the gift-opening on your phone and upload it. Thankful listens and pulls out each gift, who gave it, and how you reacted.",
          tag: "Most hands-off",
        },
        {
          icon: Upload,
          title: "Upload a list",
          body: "Already jotted things down in Notes, a spreadsheet, or a registry export? Drop in your transcript or list and let Thankful organize it.",
          tag: "Bring your own",
        },
        {
          icon: Type,
          title: "Type it in yourself",
          body: "No recording, no list? Just add each gift and giver by hand. Great for a handful of gifts or as you go.",
          tag: "Full control",
        },
      ]}
    />
  )
}

/* ---------------------------- Notes fork ------------------------------- */

function NotesFork() {
  return (
    <ForkSection
      eyebrow="Step 2 — The notes"
      title="Write them your way."
      subtitle="The AI is there for the starting point and the details, not the personal thought behind it. You decide how much help you want."
      inverted
      options={[
        {
          icon: Sparkles,
          title: "Let AI draft",
          body: "Get a warm, specific first draft for every gift that references what it was and why it mattered. A running start, never the final word.",
          tag: "A starting point",
        },
        {
          icon: Blend,
          title: "Draft, then make it yours",
          body: "Start from a draft and edit, adjust, or rewrite until it sounds like you. The most popular way to work.",
          tag: "Hybrid",
        },
        {
          icon: PenLine,
          title: "Write every word",
          body: "Prefer to write from scratch? Use Thankful purely to remember the context and write each note entirely yourself.",
          tag: "All you",
        },
      ]}
    />
  )
}

/* ---------------------------- More ways -------------------------------- */

function MoreWays() {
  const ways = [
    {
      icon: Users,
      title: "Just a smart contact list",
      body: "Keep everyone who gave a gift in one place, with what they gave and the details that made it special.",
    },
    {
      icon: Printer,
      title: "Print it out to handwrite",
      body: "Want to handwrite every card yourself? Print the list with full context so you know exactly what to say — pen still in your hand.",
    },
    {
      icon: Tag,
      title: "Address labels only",
      body: "Store mailing addresses once and print a peel-and-stick Avery label sheet. Add a stamp and send — no handwriting the envelope.",
    },
    {
      icon: ListChecks,
      title: "A checklist to finally finish",
      body: "Track who’s done and who’s left, and knock out the thank-yous you’ve been putting off — one satisfying check at a time.",
    },
  ]
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
          However it helps you
        </p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Use as much or as little as you need.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
          Some people run the whole flow end to end. Others use just one piece.
          There&apos;s no wrong way to use it.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ways.map((w) => (
          <div
            key={w.title}
            className="flex gap-4 rounded-2xl border bg-card p-6"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <w.icon className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-serif text-lg font-semibold">{w.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {w.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* --------------------------- How it works ------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Capture",
      body: "Record, upload, or type. Thankful builds your list of gifts and givers with the details intact.",
    },
    {
      n: "2",
      title: "Review & personalize",
      body: "Read through each gift, tweak the wording, or write it yourself. This is where it becomes yours.",
    },
    {
      n: "3",
      title: "Send or print",
      body: "Email the note, print a card to handwrite, or print address labels. Whatever gets it out the door.",
    },
  ]
  return (
    <section className="border-y bg-card/40">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="mb-12 text-center font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Three steps, and you&apos;re done.
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary font-serif text-lg font-semibold text-primary-foreground">
                {s.n}
              </span>
              <h3 className="font-serif text-xl font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ Voices --------------------------------- */

function Voices() {
  const quotes = [
    {
      quote:
        "I know I want to show my gratitude, but I just don’t know what to say — or I’m embarrassed my spelling and grammar isn’t great. This helps me get the words in my head onto the page.",
      who: "Someone who feels it but freezes up",
    },
    {
      quote:
        "I use it as a checklist to track what I’ve finished, so I can finally knock out the notes I’ve been holding out on.",
      who: "Someone who just needed a nudge",
    },
  ]
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-6 sm:grid-cols-2">
        {quotes.map((q) => (
          <figure
            key={q.who}
            className="flex flex-col gap-5 rounded-2xl border bg-card p-8"
          >
            <blockquote className="font-serif text-xl leading-snug text-pretty">
              {`\u201C${q.quote}\u201D`}
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              {`\u2014 ${q.who}`}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ---------------------------- Final CTA -------------------------------- */

function FinalCta() {
  const points = [
    "Record, upload, or type",
    "AI draft, hybrid, or all you",
    "Email, print, or address labels",
  ]
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-20">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          The gratitude is already yours. Let&apos;s help you say it.
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {points.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/90"
            >
              <Check className="size-4" />
              {p}
            </span>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            variant="secondary"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Get started free
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  )
}

/* --------------------------- Shared fork ------------------------------- */

type ForkOption = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  tag: string
}

function ForkSection({
  eyebrow,
  title,
  subtitle,
  options,
  inverted = false,
}: {
  eyebrow: string
  title: string
  subtitle: string
  options: ForkOption[]
  inverted?: boolean
}) {
  return (
    <section className={inverted ? "border-y bg-card/40" : ""}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
            {eyebrow}
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            {subtitle}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {options.map((o) => (
            <div
              key={o.title}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <o.icon className="size-5" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {o.tag}
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold">{o.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {o.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

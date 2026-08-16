import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import {
  Sparkles,
  Mic,
  Upload,
  Type,
  PenLine,
  Blend,
  Mail,
  Printer,
  Tag,
  ArrowRight,
  Check,
  Heart,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"
import { FREE_LIFETIME_LIMIT } from "@/lib/plans"

export const metadata: Metadata = {
  title: "Start free — say thank you your way",
  description:
    "There's no one right way to write a thank-you note. Record, upload, or type your gifts; let AI draft, work hybrid, or write every word yourself. Start free with 20 thank-you notes — no card, no monthly reset.",
  alternates: { canonical: "/launch" },
  openGraph: {
    title: "Thankful — say thank you your way",
    description:
      "Record, upload, or type your gifts, then draft with AI, work hybrid, or write every word yourself. Start free with 20 thank-you notes — no monthly reset.",
    url: "/launch",
  },
}

export default async function LaunchPage() {
  const session = await getSession()
  const usage = session?.user ? await getHeaderUsage() : null

  return (
    <div className="min-h-svh">
      <SiteHeader user={session?.user ?? null} usage={usage} />
      <main>
        <LaunchHero />
        <Relatable />
        <Flexibility />
        <Voices />
        <FinalCta />
      </main>
    </div>
  )
}

/* ------------------------------- Hero ---------------------------------- */

function LaunchHero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Free to start &middot; No card required
          </span>
          <h1 className="max-w-xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            You felt the gratitude. We&apos;ll help you say it.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            There&apos;s no one right way to write a thank-you note &mdash; so we
            built one app that does it your way. Record the gift-opening, upload
            a list, or type it in. Then let AI draft, work side by side, or write
            every word yourself. However it happens, it still sounds like you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" nativeButton={false} render={<Link href="/sign-up" />}>
              Get started free
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
          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <Check className="size-4 text-primary" />
            Start with {FREE_LIFETIME_LIMIT} free thank-you notes &mdash; yours to
            use anytime, no monthly reset.
          </p>
        </div>

        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-3xl border shadow-xl shadow-primary/5">
            <Image
              src="/landing/hero-voice.png"
              alt="A printed thank-you card reading 'With gratitude — Thank you' above a warm handwritten note"
              width={1024}
              height={1024}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-4 hidden max-w-[15rem] rotate-[-4deg] rounded-2xl border bg-card p-4 shadow-lg sm:block">
            <p className="font-hand text-2xl leading-tight text-foreground">
              &ldquo;Dear Aunt Marie, the vase is perfect for the front
              window&hellip;&rdquo;
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your words, your voice.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- Relatable ------------------------------- */

function Relatable() {
  return (
    <section className="border-b bg-card/40">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <Heart className="mx-auto mb-6 size-8 text-primary" />
        <p className="font-serif text-2xl font-medium leading-snug text-balance sm:text-3xl">
          You felt it in the moment &mdash; the hug, the &ldquo;you
          shouldn&apos;t have.&rdquo; Then the card sat blank on the counter for
          three weeks.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
          The hard part was never the gratitude &mdash; it&apos;s finding the
          words for sixty of them. Thankful remembers who gave what and the
          detail that made it special, then helps you get the words onto the
          page in your own voice. The pile you&apos;ve been dreading can
          genuinely be done this weekend.
        </p>
      </div>
    </section>
  )
}

/* ---------------------------- Flexibility ------------------------------ */

type Way = {
  icon: React.ComponentType<{ className?: string }>
  label: string
}

function Flexibility() {
  const groups: { eyebrow: string; title: string; ways: Way[] }[] = [
    {
      eyebrow: "Capture",
      title: "Get your gifts in.",
      ways: [
        { icon: Mic, label: "Record & transcribe the gift-opening" },
        { icon: Upload, label: "Upload a list you already have" },
        { icon: Type, label: "Type each gift in as you go" },
      ],
    },
    {
      eyebrow: "Write",
      title: "In your own voice.",
      ways: [
        { icon: Sparkles, label: "Let AI draft a warm first draft" },
        { icon: Blend, label: "Work hybrid — draft, then make it yours" },
        { icon: PenLine, label: "Write every word yourself" },
      ],
    },
    {
      eyebrow: "Finish",
      title: "However it gets sent.",
      ways: [
        { icon: Mail, label: "Email in a design you love" },
        { icon: Printer, label: "Print & fold a card, or a postcard" },
        { icon: Tag, label: "Print peel-and-stick address labels" },
      ],
    },
  ]

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
          Your notes, your way
        </p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Hands-off or hands-on &mdash; you choose.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
          Use the whole flow end to end, or just the one piece you need.
          There&apos;s no wrong way to use it, and no lock-in.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((g) => (
          <div
            key={g.eyebrow}
            className="flex flex-col gap-5 rounded-2xl border bg-card p-6"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-primary">
                {g.eyebrow}
              </span>
              <h3 className="font-serif text-xl font-semibold">{g.title}</h3>
            </div>
            <ul className="flex flex-col gap-3">
              {g.ways.map((w) => (
                <li key={w.label} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <w.icon className="size-4" />
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {w.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------ Voices --------------------------------- */

function Voices() {
  const quotes = [
    {
      quote:
        "I know I want to show my gratitude, but I just don't know what to say. This helps me get the words in my head onto the page.",
      who: "Someone who feels it but freezes up",
    },
    {
      quote:
        "I use it as a checklist to track what I've finished, so I can finally knock out the notes I've been holding out on.",
      who: "Someone who just needed a nudge",
    },
  ]
  return (
    <section className="border-t bg-card/40">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
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
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
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
        <p className="mt-4 text-sm text-primary-foreground/80">
          {FREE_LIFETIME_LIMIT} free notes to start &middot; no card required
          &middot; no monthly reset
        </p>
      </div>
    </section>
  )
}

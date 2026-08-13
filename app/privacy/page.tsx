import Link from "next/link"
import {
  Lock,
  Database,
  Share2,
  Bot,
  Mic,
  Users,
  Cookie,
  Trash2,
  Baby,
  RefreshCw,
  ArrowRight,
} from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Thankful, an application developed and operated by Capstone Consulting, collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
}

const LAST_UPDATED = "August 10, 2026"

const SECTIONS = [
  {
    icon: Database,
    title: "Information we collect",
    body: "We collect the information you give us and the information needed to run the Service: account details (your name and email); content you create or provide (gift lists, transcripts, thank-you note text, and the names, email addresses, and postal addresses of the people you send notes to); audio or video recordings you upload for transcription; and payment details, which are handled by our payment processor \u2014 we never see or store your full card number. We also collect basic technical and usage data (such as device, browser, and interactions) to keep the Service secure and improve it.",
  },
  {
    icon: Lock,
    title: "How we use your information",
    body: "We use your information to provide and operate the Service: to create and manage your account, generate transcripts and thank-you notes, send the notes you ask us to send, process payments and manage your subscription, respond to support requests, prevent abuse and fraud, and comply with our legal obligations. We do not sell your personal information.",
  },
  {
    icon: Share2,
    title: "Service providers we share with",
    body: "We rely on trusted third parties to run the Service, and share only what each needs to perform its function: hosting and database infrastructure (Vercel and Neon), payment processing (Stripe), email delivery (Resend), file storage (Vercel Blob), and AI providers used to transcribe recordings and draft notes. Each provider processes data under its own terms and security practices. We may also disclose information where required by law or to protect our rights and users.",
  },
  {
    icon: Bot,
    title: "AI processing",
    body: "The transcripts and thank-you notes are produced by automated AI systems. Text you provide and audio you upload are sent to these providers solely to generate your output. Please avoid submitting sensitive personal information you would not want processed by automated systems.",
  },
  {
    icon: Mic,
    title: "Recordings & media retention",
    body: "Audio and video you upload are processed only to produce your transcript and are then deleted \u2014 we aim to retain uploaded media no longer than necessary to complete that transcription. The resulting transcript and any notes you create are stored in your account until you delete them or close your account.",
  },
  {
    icon: Users,
    title: "Information about other people",
    body: "To send thank-you notes, you provide information about recipients (such as names, email addresses, and postal addresses). You are responsible for having a lawful basis to share that information with us and, where required, for obtaining consent to record or process it. We use recipient information only to deliver the notes you request.",
  },
  {
    icon: Cookie,
    title: "Cookies & sessions",
    body: "We use a small number of essential cookies, primarily to keep you signed in and to keep the Service secure. These are necessary for the app to function; we do not use them for third-party advertising.",
  },
  {
    icon: Trash2,
    title: "Your rights & choices",
    body: "Depending on where you live, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. You can update your account details in the app, and you can request access to or deletion of your data by contacting us. We will respond consistent with applicable law.",
  },
  {
    icon: Baby,
    title: "Children",
    body: "The Service is not directed to children under 13 (or the minimum age required in your jurisdiction), and we do not knowingly collect personal information from them. If you believe a child has provided us information, contact us and we will delete it.",
  },
  {
    icon: RefreshCw,
    title: "Changes to this policy",
    body: "We may update this Privacy Policy from time to time. When we make material changes, we will update the \u201clast updated\u201d date above, and your continued use of the Service after a change means you accept the revised policy.",
  },
]

export default async function PrivacyPage() {
  const session = await getSession()
  const usage = session?.user ? await getHeaderUsage() : null

  return (
    <div className="min-h-svh">
      <SiteHeader user={session?.user ?? null} usage={usage} />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-12 flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Lock className="size-3.5 text-primary" />
            Legal
          </span>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            {"This policy explains how "}
            <span className="font-serif italic text-foreground">
              Thankful AI
            </span>
            {", an application developed and operated by "}
            <a
              href="https://capstoneconsulting.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Capstone Consulting
            </a>
            {", collects, uses, and protects your information."}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="flex gap-4 rounded-2xl border bg-card p-6"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <s.icon className="size-5 text-primary" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="font-serif text-lg font-semibold leading-tight">
                  {s.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {s.body}
                </p>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border bg-secondary/50 p-6 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {"Questions or requests about your data? Contact Capstone Consulting at "}
            <a
              href="mailto:hello@capstoneconsulting.co"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              hello@capstoneconsulting.co
            </a>
            .
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/terms" />}
            >
              Terms of Service
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

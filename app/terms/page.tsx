import Link from "next/link"
import {
  FileText,
  UserCheck,
  CreditCard,
  Ban,
  MessageSquareText,
  Bot,
  Copyright,
  Scale,
  LogOut,
  RefreshCw,
  ArrowRight,
} from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/session"
import { getHeaderUsage } from "@/lib/header-usage"

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of Thankful, an application developed and operated by Capstone Consulting.",
  alternates: { canonical: "/terms" },
}

const LAST_UPDATED = "August 10, 2026"

const SECTIONS = [
  {
    icon: FileText,
    title: "Acceptance of these terms",
    body: "These Terms of Service (the \u201cTerms\u201d) are a binding agreement between you and Capstone Consulting governing your use of Thankful AI (the \u201cService\u201d). By creating an account or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Service.",
  },
  {
    icon: UserCheck,
    title: "Your account",
    body: "You must provide accurate information and be at least the age of majority in your jurisdiction (or have permission from a parent or guardian). You are responsible for keeping your login credentials confidential and for all activity that occurs under your account. Notify us promptly if you suspect unauthorized use.",
  },
  {
    icon: CreditCard,
    title: "Plans, billing & refunds",
    body: "Some features require a paid plan or one-time purchase. Prices are shown in the app and processed by our payment provider. Paid subscriptions renew automatically for the same period unless you cancel before the renewal date; you can cancel at any time and will retain access through the end of the current billing period. Except where required by law, payments are non-refundable, and one-time purchases are final once used. We may change pricing prospectively with notice.",
  },
  {
    icon: Ban,
    title: "Acceptable use",
    body: "You agree not to misuse the Service: no unlawful, deceptive, harassing, or infringing activity; no sending of spam or unsolicited messages; no uploading of content you don\u2019t have the right to use; no attempts to disrupt, reverse-engineer, or gain unauthorized access to the Service; and no use that violates the rights of others. We may suspend or remove content or accounts that violate these Terms.",
  },
  {
    icon: MessageSquareText,
    title: "Your content & consent",
    body: "You retain ownership of the content you submit (transcripts, notes, recordings, and recipient details). You grant us a limited license to process and store that content solely to operate the Service for you. You represent that you have the right to submit it and, where applicable, that you have obtained any consent required to record or process other people\u2019s information.",
  },
  {
    icon: Bot,
    title: "AI-generated output",
    body: "The Service uses automated AI to produce transcripts and draft thank-you notes. Output may be inaccurate or incomplete and is provided as a draft for your review. You are solely responsible for reviewing, editing, and approving any content before you send, print, or share it.",
  },
  {
    icon: Copyright,
    title: "Intellectual property",
    body: "The Service, including its software, design, and branding, is owned by Capstone Consulting and protected by applicable laws. These Terms do not grant you any right to our trademarks or to copy, modify, or distribute the Service except as expressly permitted.",
  },
  {
    icon: Scale,
    title: "Disclaimers & limitation of liability",
    body: "The Service is provided \u201cas is\u201d without warranties of any kind, and your use is at your own risk, as described in our Disclaimer. To the fullest extent permitted by law, Capstone Consulting will not be liable for any indirect, incidental, or consequential damages, and our total liability arising from the Service will not exceed the amount you paid us in the twelve months before the claim.",
  },
  {
    icon: LogOut,
    title: "Termination",
    body: "You may stop using the Service and close your account at any time. We may suspend or terminate your access if you violate these Terms or if we discontinue the Service. Provisions that by their nature should survive termination \u2014 including ownership, disclaimers, and limitation of liability \u2014 will continue to apply.",
  },
  {
    icon: RefreshCw,
    title: "Changes & governing law",
    body: "We may update these Terms from time to time; material changes will be reflected in the \u201clast updated\u201d date, and continued use of the Service means you accept the revised Terms. These Terms are governed by the laws of the jurisdiction in which Capstone Consulting operates, without regard to conflict-of-law rules.",
  },
]

export default async function TermsPage() {
  const session = await getSession()
  const usage = session?.user ? await getHeaderUsage() : null

  return (
    <div className="min-h-svh">
      <SiteHeader user={session?.user ?? null} usage={usage} />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-12 flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <FileText className="size-3.5 text-primary" />
            Legal
          </span>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            {"These terms govern your use of "}
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
            {". Please read them carefully."}
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
            {"Questions about these terms? Contact Capstone Consulting at "}
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
              render={<Link href="/privacy" />}
            >
              Privacy Policy
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/disclaimer" />}
            >
              Disclaimer
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

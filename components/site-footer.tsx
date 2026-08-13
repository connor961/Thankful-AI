import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-serif italic text-foreground">Thankful AI</span>
          {" is an app developed and operated by "}
          <a
            href="https://capstoneconsulting.co"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Capstone Consulting
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          {"Questions or need a hand? Email us at "}
          <a
            href="mailto:hello@capstoneconsulting.co"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            hello@capstoneconsulting.co
          </a>
          .
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
          <span>
            {`\u00A9 ${new Date().getFullYear()} Capstone Consulting. All rights reserved.`}
          </span>
          <span aria-hidden="true">&middot;</span>
          <Link
            href="/privacy"
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacy
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link
            href="/terms"
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            Terms
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link
            href="/disclaimer"
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  )
}

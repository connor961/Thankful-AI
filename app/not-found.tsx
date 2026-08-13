import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Branded 404 shown when a route or record doesn't exist — e.g. an event id
 * that isn't found for the current user. Replaces the default Next.js 404.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Heart className="size-6" fill="currentColor" />
      </div>
      <p className="mt-6 text-sm font-medium uppercase tracking-wide text-primary">
        404
      </p>
      <h1 className="mt-2 font-serif text-3xl text-foreground text-balance sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground text-pretty">
        The event or page you&apos;re looking for may have been removed, or the
        link might be incorrect.
      </p>
      <div className="mt-8">
        <Button nativeButton={false} render={<Link href="/" />}>
          Back to your events
        </Button>
      </div>
    </main>
  )
}

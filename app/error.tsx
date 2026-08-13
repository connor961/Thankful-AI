"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Heart, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * App-wide error boundary. Without this, any unexpected server or client error
 * surfaces as the opaque "this page couldn't load" screen with no way to
 * recover. This renders a friendly, on-brand page with a "Try again" action
 * that re-runs the failed render.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log("[v0] app error boundary:", error.message, error.digest)
  }, [error])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Heart className="size-6" fill="currentColor" />
      </div>
      <h1 className="mt-6 font-serif text-3xl text-foreground text-balance sm:text-4xl">
        Something went sideways
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground text-pretty">
        We hit an unexpected snag loading this page. Your notes are safe — give
        it another try, and if it keeps happening, head back home.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Back to your events
        </Button>
      </div>
    </main>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { Sparkles, Loader2 } from "lucide-react"
import { createSampleEvent } from "@/app/actions/events"
import { Button } from "@/components/ui/button"

/**
 * One-click entry point on the empty dashboard: seeds a ready-made sample event
 * (wedding with three drafted notes) and drops the user straight into it so they
 * experience the full workflow before entering any of their own data. The sample
 * uses draft notes only, so it never spends the user's free-note allowance.
 */
export function SampleEventButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const eventId = await createSampleEvent()
        router.push(`/events/${eventId}`)
        router.refresh()
      } catch {
        toast.error("Couldn't create the sample event. Please try again.")
      }
    })
  }

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 data-icon="inline-start" className="animate-spin" />
      ) : (
        <Sparkles data-icon="inline-start" />
      )}
      {pending ? "Setting up your sample…" : "Explore a sample event"}
    </Button>
  )
}

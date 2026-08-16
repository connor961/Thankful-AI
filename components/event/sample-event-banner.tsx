"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Sparkles, Trash2, ArrowRight, Loader2 } from "lucide-react"
import { deleteEvent } from "@/app/actions/events"
import { Button } from "@/components/ui/button"

/**
 * Shown at the top of a sample event's workspace. It orients the user ("this is
 * an example, explore freely") and offers the two natural next steps: create
 * their own event, or clear the sample. Keeping this guidance inside the event
 * — not just on the dashboard — bridges the gap between seeing the "aha" and
 * taking real action.
 */
export function SampleEventBanner({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteEvent(eventId)
        toast.success("Sample event removed")
        router.push("/")
        router.refresh()
      } catch {
        toast.error("Couldn't remove the sample. Please try again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-4 text-primary" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">This is a sample event</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Explore freely — open a note, edit the wording, try the tabs. When
            you&apos;re ready, start your own or clear the sample.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/events/new" />}
        >
          Start my own event
          <ArrowRight data-icon="inline-end" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          disabled={pending}
        >
          {pending ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Trash2 data-icon="inline-start" />
          )}
          Clear sample
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  CalendarDays,
  Gift,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import type { EventWithStats } from "@/app/actions/events"
import { deleteEvent } from "@/app/actions/events"
import { EVENT_TYPE_LABELS } from "@/lib/types"
import { formatDate } from "@/lib/format"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function EventCard({ event }: { event: EventWithStats }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(event.id)
      toast.success("Event deleted")
      router.refresh()
    })
  }

  const done = event.approved_count + event.sent_count

  return (
    <Card className="group relative gap-0 overflow-hidden transition-shadow hover:shadow-md">
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Open ${event.name}`}
      />
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="capitalize">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </Badge>
            {event.is_sample ? (
              <Badge className="gap-1 bg-primary/10 text-primary">
                <Sparkles className="size-3" />
                Sample
              </Badge>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-20 -mt-1 -mr-2 size-8 opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100"
                  disabled={pending}
                  aria-label="Event options"
                >
                  <MoreVertical />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="z-20">
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 data-icon="inline-start" />
                  Delete event
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-serif text-xl font-semibold leading-tight text-balance">
            {event.name}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {formatDate(event.event_date)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="mt-4 flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Gift className="size-4 text-primary" />
          {event.gift_count} {event.gift_count === 1 ? "gift" : "gifts"}
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-chart-4" />
          {done} ready
        </span>
        {event.review_count > 0 ? (
          <span className="flex items-center gap-1.5 text-primary">
            <AlertCircle className="size-4" />
            {event.review_count} to review
          </span>
        ) : null}
      </CardFooter>
    </Card>
  )
}

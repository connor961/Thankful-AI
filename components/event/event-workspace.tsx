"use client"

import { useMemo, useState } from "react"
import {
  Plus,
  ListChecks,
  ScrollText,
  BarChart3,
  PartyPopper,
  ImageIcon,
  Gift,
  ListPlus,
  Pencil,
} from "lucide-react"
import type { EventRow, GiftWithNote, LabelAddress } from "@/lib/types"
import type { PlanId } from "@/lib/plans"
import { NoteCard } from "@/components/event/note-card"
import { CapturePanel } from "@/components/event/capture-panel"
import { AnalyticsPanel } from "@/components/event/analytics-panel"
import { ExportMenu } from "@/components/event/export-menu"
import { EventPhoto } from "@/components/event/event-photo"
import { ManualGiftDialog } from "@/components/event/manual-gift-dialog"
import { BulkGiftDialog } from "@/components/event/bulk-gift-dialog"
import { EditEventDialog } from "@/components/event/edit-event-dialog"
import { RegenerateAllDialog } from "@/components/event/regenerate-all-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type ReviewFilter = "attention" | "all" | "approved" | "sent"

export function EventWorkspace({
  event,
  items,
  contactEmails = {},
  contactNames = [],
  contactAddresses = {},
  returnAddress = null,
  senderAddress,
  planId,
}: {
  event: EventRow
  items: GiftWithNote[]
  contactEmails?: Record<string, string>
  contactNames?: string[]
  contactAddresses?: Record<string, LabelAddress>
  returnAddress?: LabelAddress | null
  senderAddress?: string
  planId?: PlanId
}) {
  const [filter, setFilter] = useState<ReviewFilter>("attention")

  const suggestedEmailFor = (giver: string) =>
    contactEmails[giver.trim().toLowerCase()] ?? ""

  const addressFor = (giver: string) =>
    contactAddresses[giver.trim().toLowerCase()] ?? null

  const contactNameSet = useMemo(
    () => new Set(contactNames),
    [contactNames],
  )
  const isContact = (giver: string) =>
    contactNameSet.has(giver.trim().toLowerCase())

  const reviewItems = useMemo(() => {
    switch (filter) {
      case "attention":
        return items.filter(
          (i) => i.needs_review || (i.note?.status ?? "draft") === "draft",
        )
      case "approved":
        return items.filter((i) => i.note?.status === "approved")
      case "sent":
        return items.filter((i) => i.note?.status === "sent")
      default:
        return items
    }
  }, [items, filter])

  const attentionCount = items.filter(
    (i) => i.needs_review || (i.note?.status ?? "draft") === "draft",
  ).length

  // Notes that can be bulk-regenerated: any that exist and haven't been sent.
  const regenerableCount = items.filter(
    (i) => i.note && i.note.status !== "sent",
  ).length

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-2xl font-semibold">
              Capture the moment
            </h2>
            <p className="text-muted-foreground text-pretty">
              Import a transcript from the gift opening and we&apos;ll do the
              rest.
            </p>
          </div>
          <EditEventDialog
            event={event}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil data-icon="inline-start" />
                Edit event
              </Button>
            }
          />
        </div>
        <CapturePanel
          eventId={event.id}
          eventType={event.event_type}
          planId={planId}
        />
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="flex w-full items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span>No transcript?</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ManualGiftDialog
              eventId={event.id}
              trigger={
                <Button variant="outline" size="sm">
                  <Gift data-icon="inline-start" />
                  Add a gift manually
                </Button>
              }
            />
            <BulkGiftDialog
              eventId={event.id}
              trigger={
                <Button variant="outline" size="sm">
                  <ListPlus data-icon="inline-start" />
                  Add gifts in bulk
                </Button>
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="notes" className="gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="notes">
            <ScrollText data-icon="inline-start" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="review">
            <ListChecks data-icon="inline-start" />
            Review
            {attentionCount > 0 ? (
              <Badge variant="secondary" className="ml-1.5">
                {attentionCount}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 data-icon="inline-start" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <EditEventDialog
            event={event}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil data-icon="inline-start" />
                Edit event
              </Button>
            }
          />
          <RegenerateAllDialog eventId={event.id} count={regenerableCount} />
          <ExportMenu
            event={event}
            items={items}
            contactAddresses={contactAddresses}
            returnAddress={returnAddress}
          />
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant={event.photo_url ? "secondary" : "outline"}
                  size="sm"
                >
                  <ImageIcon data-icon="inline-start" />
                  {event.photo_url ? "Card photo" : "Add card photo"}
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Event card photo</DialogTitle>
                <DialogDescription>
                  Add one photo for this event. It appears as a banner on every
                  emailed thank-you note, so each card feels personal.
                </DialogDescription>
              </DialogHeader>
              <EventPhoto eventId={event.id} photoUrl={event.photo_url} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus data-icon="inline-start" />
                  Add transcript
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add another transcript</DialogTitle>
                <DialogDescription>
                  Import more of the event and we&apos;ll add any new gifts to
                  your timeline.
                </DialogDescription>
              </DialogHeader>
              <CapturePanel
                eventId={event.id}
                eventType={event.event_type}
                planId={planId}
                compact
              />
            </DialogContent>
          </Dialog>
          <BulkGiftDialog
            eventId={event.id}
            trigger={
              <Button variant="outline" size="sm">
                <ListPlus data-icon="inline-start" />
                Add in bulk
              </Button>
            }
          />
          <ManualGiftDialog
            eventId={event.id}
            trigger={
              <Button size="sm">
                <Gift data-icon="inline-start" />
                Add gift
              </Button>
            }
          />
        </div>
      </div>

      <TabsContent value="notes" className="flex flex-col gap-4">
        {items.map((item) => (
          <NoteCard
            key={item.id}
            item={item}
            suggestedEmail={suggestedEmailFor(item.giver)}
            inContacts={isContact(item.giver)}
            photoUrl={event.photo_url}
            design={event.email_design}
            eventName={event.name}
            senderAddress={senderAddress}
            recipientAddress={addressFor(item.giver)}
            returnAddress={returnAddress}
          />
        ))}
      </TabsContent>

      <TabsContent value="review" className="flex flex-col gap-4">
        <ToggleGroup
          variant="outline"
          value={[filter]}
          onValueChange={(v) =>
            setFilter(((v[v.length - 1] as ReviewFilter) ?? filter))
          }
          className="flex-wrap"
        >
          <ToggleGroupItem value="attention">Needs attention</ToggleGroupItem>
          <ToggleGroupItem value="approved">Approved</ToggleGroupItem>
          <ToggleGroupItem value="sent">Sent</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>

        {reviewItems.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PartyPopper />
              </EmptyMedia>
              <EmptyTitle>All caught up</EmptyTitle>
              <EmptyDescription>
                Nothing in this view right now. Nicely done.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          reviewItems.map((item) => (
            <NoteCard
              key={item.id}
              item={item}
              suggestedEmail={suggestedEmailFor(item.giver)}
              inContacts={isContact(item.giver)}
              photoUrl={event.photo_url}
              design={event.email_design}
              eventName={event.name}
              senderAddress={senderAddress}
              recipientAddress={addressFor(item.giver)}
              returnAddress={returnAddress}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="analytics">
        <AnalyticsPanel items={items} />
      </TabsContent>
    </Tabs>
  )
}

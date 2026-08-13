"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { updateEventDetails } from "@/app/actions/events"
import {
  EVENT_TYPE_LABELS,
  TONE_DESCRIPTIONS,
  TONE_LABELS,
  type EmailDesign,
  type EventRow,
  type EventType,
  type Tone,
} from "@/lib/types"
import { EmailDesignPicker } from "@/components/event/email-design-picker"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Spinner } from "@/components/ui/spinner"

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[]
const TONES = Object.keys(TONE_LABELS) as Tone[]

/**
 * The DB stores event_date as a `date`, which the Neon driver hands back as a JS
 * `Date` object (a plain ISO string can also arrive). A native date input needs a
 * "YYYY-MM-DD" string, extracted in UTC so it matches the stored calendar day.
 */
function toDateInput(value: string | Date | null): string {
  if (!value) return ""
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10)
  }
  return value.slice(0, 10)
}

export function EditEventDialog({
  event,
  trigger,
}: {
  event: EventRow
  trigger: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(event.name)
  const [eventType, setEventType] = useState<EventType>(event.event_type)
  const [eventDate, setEventDate] = useState(toDateInput(event.event_date))
  const [recipients, setRecipients] = useState(event.recipient_names)
  const [signoff, setSignoff] = useState(event.sender_signoff)
  const [description, setDescription] = useState(event.description)
  const [tone, setTone] = useState<Tone>(event.tone)
  const [emailDesign, setEmailDesign] = useState<EmailDesign>(
    event.email_design,
  )

  // Re-sync the form to the latest event whenever the dialog is opened, so a
  // second edit starts from the saved values rather than a stale draft.
  function resetToEvent() {
    setName(event.name)
    setEventType(event.event_type)
    setEventDate(toDateInput(event.event_date))
    setRecipients(event.recipient_names)
    setSignoff(event.sender_signoff)
    setDescription(event.description)
    setTone(event.tone)
    setEmailDesign(event.email_design)
  }

  function pickSingle<T extends string>(current: T, next: string[]): T {
    const chosen = next[next.length - 1] as T | undefined
    return chosen ?? current
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please give your event a name")
      return
    }
    startTransition(async () => {
      try {
        await updateEventDetails(event.id, {
          name: name.trim(),
          event_type: eventType,
          event_date: eventDate || null,
          recipient_names: recipients.trim(),
          sender_signoff: signoff.trim(),
          description: description.trim(),
          tone,
          email_design: emailDesign,
        })
        toast.success("Event updated")
        setOpen(false)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong updating your event",
        )
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) resetToEvent()
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
            <DialogDescription>
              Update the details for this event. Changes to the context and tone
              shape any new or regenerated notes.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="my-4">
            <Field>
              <FieldLabel htmlFor="edit-name">Event name</FieldLabel>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel>Occasion</FieldLabel>
              <ToggleGroup
                variant="outline"
                className="flex-wrap"
                value={[eventType]}
                onValueChange={(v) => setEventType(pickSingle(eventType, v))}
              >
                {EVENT_TYPES.map((t) => (
                  <ToggleGroupItem key={t} value={t} disabled={pending}>
                    {EVENT_TYPE_LABELS[t]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-date">Event date</FieldLabel>
              <Input
                id="edit-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                disabled={pending}
                className="w-fit"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-recipients">Recipient(s)</FieldLabel>
              <Input
                id="edit-recipients"
                placeholder="Kennedi and Connor"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                disabled={pending}
              />
              <FieldDescription>
                Who is receiving the gifts and sending the thank-yous.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-signoff">Sign the notes as</FieldLabel>
              <Input
                id="edit-signoff"
                placeholder="Love, Kennedi & Connor"
                value={signoff}
                onChange={(e) => setSignoff(e.target.value)}
                disabled={pending}
              />
              <FieldDescription>
                How each note should be signed off.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-description">Event context</FieldLabel>
              <Textarea
                id="edit-description"
                placeholder="A relaxed backyard shower with close family. Keep things light and a little funny."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={pending}
              />
              <FieldDescription>
                Optional. Describe the vibe, the people, or any details you want
                the AI to weave into every note.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Note tone</FieldLabel>
              <ToggleGroup
                variant="outline"
                className="flex-wrap"
                value={[tone]}
                onValueChange={(v) => setTone(pickSingle(tone, v))}
              >
                {TONES.map((t) => (
                  <ToggleGroupItem key={t} value={t} disabled={pending}>
                    {TONE_LABELS[t]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>{TONE_DESCRIPTIONS[tone]}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Email design</FieldLabel>
              <EmailDesignPicker
                value={emailDesign}
                onChange={setEmailDesign}
                disabled={pending}
              />
              <FieldDescription>
                How the thank-you emails will look when sent to your guests.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

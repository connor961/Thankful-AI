"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import { createEvent } from "@/app/actions/events"
import {
  EVENT_TYPE_LABELS,
  TONE_DESCRIPTIONS,
  TONE_LABELS,
  type EmailDesign,
  type EventType,
  type Tone,
} from "@/lib/types"
import { EmailDesignPicker } from "@/components/event/email-design-picker"
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

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[]
const TONES = Object.keys(TONE_LABELS) as Tone[]

export function CreateEventForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [eventType, setEventType] = useState<EventType>("baby-shower")
  const [eventDate, setEventDate] = useState("")
  const [recipients, setRecipients] = useState("")
  const [signoff, setSignoff] = useState("")
  const [description, setDescription] = useState("")
  const [tone, setTone] = useState<Tone>("warm")
  const [emailDesign, setEmailDesign] = useState<EmailDesign>("classic")

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
        const id = await createEvent({
          name: name.trim(),
          event_type: eventType,
          event_date: eventDate || null,
          recipient_names: recipients.trim(),
          sender_signoff: signoff.trim(),
          description: description.trim(),
          tone,
          email_design: emailDesign,
        })
        toast.success("Event created")
        router.push(`/events/${id}`)
      } catch (err) {
        toast.error(
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong creating your event",
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Event name</FieldLabel>
          <Input
            id="name"
            placeholder="Kennedi & Connor's Baby Shower"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              <ToggleGroupItem key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="date">Event date</FieldLabel>
          <Input
            id="date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-fit"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="recipients">Recipient(s)</FieldLabel>
          <Input
            id="recipients"
            placeholder="Kennedi and Connor"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
          />
          <FieldDescription>
            Who is receiving the gifts and sending the thank-yous.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="signoff">Sign the notes as</FieldLabel>
          <Input
            id="signoff"
            placeholder="Love, Kennedi & Connor"
            value={signoff}
            onChange={(e) => setSignoff(e.target.value)}
          />
          <FieldDescription>
            How each note should be signed off.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Event context</FieldLabel>
          <Textarea
            id="description"
            placeholder="A relaxed backyard shower with close family. Kennedi's side is playful and loves inside jokes, so keep things light and a little funny. Mention how far some guests traveled."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <FieldDescription>
            Optional. Describe the vibe, the people, or any details you want the
            AI to weave into every note. This shapes how the thank-yous read.
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
              <ToggleGroupItem key={t} value={t}>
                {TONE_LABELS[t]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{TONE_DESCRIPTIONS[tone]}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Email design</FieldLabel>
          <EmailDesignPicker value={emailDesign} onChange={setEmailDesign} />
          <FieldDescription>
            How the thank-you emails will look when sent to your guests.
          </FieldDescription>
        </Field>

        <Field orientation="horizontal" className="justify-end">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Creating..." : "Continue to capture"}
            {!pending ? <ArrowRight data-icon="inline-end" /> : null}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

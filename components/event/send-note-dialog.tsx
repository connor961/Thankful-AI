"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, ExternalLink } from "lucide-react"
import { sendNote, updateGiftEmail } from "@/app/actions/events"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
import { eventPhotoSrc } from "@/components/event/event-photo"
import { formatNoteForDisplay } from "@/lib/note-format"
import { mailtoForNote } from "@/lib/export"
import type { GiftWithNote } from "@/lib/types"
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
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SendNoteDialog({
  item,
  disabled,
  suggestedEmail,
  photoUrl,
  senderAddress,
}: {
  item: GiftWithNote
  disabled?: boolean
  suggestedEmail?: string
  photoUrl?: string
  senderAddress?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // Prefer the gift's saved email; otherwise fall back to a matched contact.
  const initialEmail = item.recipient_email?.trim() || suggestedEmail?.trim() || ""
  const [email, setEmail] = useState(initialEmail)
  const [pending, startTransition] = useTransition()

  const note = item.note
  const valid = EMAIL_RE.test(email.trim())
  const fromContact =
    !item.recipient_email?.trim() &&
    Boolean(suggestedEmail?.trim()) &&
    email.trim() === suggestedEmail?.trim()

  function handleSend() {
    if (!note || !valid) return
    startTransition(async () => {
      try {
        if (email.trim() !== (item.recipient_email ?? "")) {
          await updateGiftEmail(item.id, email.trim())
        }
        const result = await sendNote(note.id)
        if (!result.ok) {
          if (result.code === "limit_reached") {
            setOpen(false)
            toast.error(result.error, {
              duration: 8000,
              action: {
                label: "Upgrade",
                onClick: () => openUpgradeDialog(result.error),
              },
            })
          } else {
            toast.error(result.error)
          }
          return
        }
        toast.success(`Thank-you note sent to ${item.giver}`)
        setOpen(false)
        router.refresh()
      } catch {
        toast.error("Couldn't send the note. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" disabled={disabled || !note}>
            <Send data-icon="inline-start" />
            Send email
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send this thank-you note</DialogTitle>
          <DialogDescription>
            We&apos;ll email the note below to {item.giver}
            {senderAddress ? (
              <>
                {" "}
                from <span className="font-medium text-foreground">{senderAddress}</span>
              </>
            ) : null}
            . You can tweak the wording from the card before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`email-${item.id}`}>
              {item.giver}&apos;s email address
            </Label>
            <Input
              id={`email-${item.id}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fromContact ? (
              <p className="text-xs text-muted-foreground">
                Auto-filled from your contacts.
              </p>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border bg-card">
            <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-foreground/70">
                With Gratitude
              </span>
              <span className="font-serif text-lg italic text-foreground">
                Thank you
              </span>
              <span className="h-px w-12 bg-accent" />
            </div>
            <p className="whitespace-pre-line px-6 pt-3 pb-4 font-serif text-sm leading-relaxed text-foreground/90">
              {note?.content
                ? formatNoteForDisplay(note.content)
                : "No note generated yet."}
            </p>
            {photoUrl ? (
              <div className="px-6 pb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={eventPhotoSrc(photoUrl) || "/placeholder.svg"}
                  alt="Event card photo"
                  className="w-full rounded-lg object-cover shadow-md"
                />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={note ? mailtoForNote(item) : "#"}
                  onClick={() => setOpen(false)}
                >
                  <ExternalLink data-icon="inline-start" />
                  Open in mail app instead
                </a>
              }
            />
            <p className="px-2 text-xs text-muted-foreground text-pretty">
              Sends from your own email account instead.
            </p>
          </div>
          <div className="flex gap-2">
            <DialogClose
              render={
                <Button variant="outline" size="sm" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button size="sm" onClick={handleSend} disabled={pending || !valid}>
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Send data-icon="inline-start" />
              )}
              Send note
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

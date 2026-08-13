"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Check,
  X,
  RefreshCw,
  Pencil,
  Send,
  Sparkles,
  MessageSquareQuote,
  AlertTriangle,
  ChevronDown,
  ClipboardCopy,
  UserPlus,
} from "lucide-react"
import {
  regenerateNote,
  setNoteStatus,
  updateGift,
  updateNoteContent,
} from "@/app/actions/events"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
import {
  TONE_LABELS,
  type EmailDesign,
  type GiftWithNote,
  type LabelAddress,
  type NoteStatus,
  type Tone,
} from "@/lib/types"
import { initials } from "@/lib/format"
import { formatNoteForDisplay } from "@/lib/note-format"
import { cn } from "@/lib/utils"
import { SendNoteDialog } from "@/components/event/send-note-dialog"
import { PrintCardDialog } from "@/components/event/print-card-dialog"
import { PrintPostcardDialog } from "@/components/event/print-postcard-dialog"
import { ContactDialog } from "@/components/contacts/contact-dialog"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const TONES = Object.keys(TONE_LABELS) as Tone[]

const STATUS_META: Record<
  NoteStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  approved: {
    label: "Approved",
    className: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  },
  sent: {
    label: "Sent",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-muted text-muted-foreground",
  },
}

function confidenceTone(value: number): string {
  if (value >= 95) return "text-chart-4"
  if (value >= 90) return "text-accent-foreground"
  return "text-primary"
}

export function NoteCard({
  item,
  suggestedEmail,
  inContacts,
  photoUrl,
  design = "classic",
  eventName,
  senderAddress,
  recipientAddress = null,
  returnAddress = null,
}: {
  item: GiftWithNote
  suggestedEmail?: string
  inContacts?: boolean
  photoUrl?: string
  design?: EmailDesign
  eventName?: string
  senderAddress?: string
  recipientAddress?: LabelAddress | null
  returnAddress?: LabelAddress | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.note?.content ?? "")

  const [resolving, setResolving] = useState(false)
  const [giver, setGiver] = useState(item.giver)
  const [giftText, setGiftText] = useState(item.gift)
  const [relationship, setRelationship] = useState(item.relationship)

  const [regenOpen, setRegenOpen] = useState(false)
  const [instructions, setInstructions] = useState("")
  const [regenTone, setRegenTone] = useState<Tone | "current">("current")

  const note = item.note
  const status = note?.status ?? "draft"

  function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch {
        toast.error("Something went wrong. Please try again.")
      } finally {
        setBusy(null)
      }
    })
  }

  function handleSaveEdit() {
    if (!note) return
    run("save", async () => {
      await updateNoteContent(note.id, draft.trim())
      setEditing(false)
      toast.success("Note updated")
    })
  }

  function handleStatus(next: NoteStatus, msg: string) {
    if (!note) return
    run(next, async () => {
      await setNoteStatus(note.id, next)
      toast.success(msg)
    })
  }

  function handleRegenerate(tone?: Tone, instructions?: string) {
    if (!note) return
    run("regen", async () => {
      const result = await regenerateNote(note.id, tone, instructions)
      if (!result.ok) {
        if (result.code === "limit_reached") {
          setRegenOpen(false)
          toast.error(result.error, {
            duration: 8000,
            action: {
              label: "Upgrade",
              onClick: () => openUpgradeDialog(result.error),
            },
          })
        } else if (result.code === "billing") {
          toast.error(result.error, {
            duration: 12000,
            action: {
              label: "Add card",
              onClick: () =>
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank",
                  "noopener,noreferrer",
                ),
            },
          })
        } else {
          toast.error(result.error)
        }
        return
      }
      setRegenOpen(false)
      setInstructions("")
      toast.success(
        instructions?.trim()
          ? "Note rewritten with your notes"
          : tone
            ? `Rewritten in a ${TONE_LABELS[tone].toLowerCase()} tone`
            : "Note regenerated",
      )
    })
  }

  async function handleCopy() {
    if (!note) return
    try {
      await navigator.clipboard.writeText(formatNoteForDisplay(note.content))
      toast.success("Note copied to clipboard")
    } catch {
      toast.error("Couldn't access the clipboard")
    }
  }

  function handleResolve() {
    run("resolve", async () => {
      await updateGift(item.id, {
        giver: giver.trim(),
        gift: giftText.trim(),
        relationship: relationship.trim(),
      })
      setResolving(false)
      toast.success("Details confirmed")
    })
  }

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden transition-colors",
        item.needs_review && "border-primary/40 bg-primary/[0.02]",
      )}
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">
              {initials(item.giver)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-lg font-semibold leading-tight">
                {item.giver}
              </span>
              {item.relationship ? (
                <Badge variant="outline" className="font-normal">
                  {item.relationship}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{item.gift}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 capitalize", STATUS_META[status].className)}
          >
            {STATUS_META[status].label}
          </Badge>
        </div>

        {item.reaction || item.quote ? (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
            {item.reaction ? (
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">Reaction:</span>
                <span className="font-medium">{item.reaction}</span>
              </div>
            ) : null}
            {item.quote ? (
              <div className="flex items-start gap-2 text-sm">
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="italic text-muted-foreground">
                  &ldquo;{item.quote}&rdquo;
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {item.needs_review ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <AlertTriangle className="size-4" />
              Needs a quick confirmation
            </div>
            <p className="text-sm text-muted-foreground">
              We&apos;re {Math.min(item.giver_confidence, item.gift_confidence)}%
              sure on this one. Confirm the details and we&apos;ll lock it in.
            </p>
            {resolving ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={giver}
                  onChange={(e) => setGiver(e.target.value)}
                  placeholder="Giver"
                />
                <Input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Relationship (optional)"
                />
                <Input
                  value={giftText}
                  onChange={(e) => setGiftText(e.target.value)}
                  placeholder="Gift"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleResolve} disabled={pending}>
                    {busy === "resolve" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                    Confirm details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setResolving(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => setResolving(true)}
              >
                <Pencil data-icon="inline-start" />
                Review details
              </Button>
            )}
          </div>
        ) : null}

        <Separator />

        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              className="resize-none leading-relaxed"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={pending}>
                {busy === "save" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(note?.content ?? "")
                  setEditing(false)
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="font-serif text-[0.95rem] leading-relaxed whitespace-pre-line text-foreground/90">
            {note?.content
              ? formatNoteForDisplay(note.content)
              : "No note generated yet."}
          </p>
        )}
      </CardContent>

      {!editing ? (
        <CardFooter className="flex-wrap gap-2 border-t pt-4">
          {status !== "sent" ? (
            <Button
              size="sm"
              onClick={() => handleStatus("sent", "Marked as sent")}
              disabled={pending}
            >
              {busy === "sent" ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
              Mark sent
            </Button>
          ) : null}
          {status !== "approved" && status !== "sent" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatus("approved", "Note approved")}
              disabled={pending}
            >
              {busy === "approved" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
              Approve
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={pending || !note}
          >
            <ClipboardCopy data-icon="inline-start" />
            Copy
          </Button>
          {!inContacts ? (
            <ContactDialog
              defaults={{
                name: item.giver,
                email: item.recipient_email || suggestedEmail || "",
                relationship: item.relationship,
              }}
              trigger={
                <Button size="sm" variant="ghost" disabled={pending}>
                  <UserPlus data-icon="inline-start" />
                  Add to contacts
                </Button>
              }
            />
          ) : null}
          <SendNoteDialog
            item={item}
            disabled={pending}
            suggestedEmail={suggestedEmail}
            photoUrl={photoUrl}
            senderAddress={senderAddress}
          />
          {note ? (
            <PrintCardDialog
              note={note.content}
              giver={item.giver}
              design={design}
              photoUrl={photoUrl}
              eventName={eventName}
              disabled={pending}
            />
          ) : null}
          {note ? (
            <PrintPostcardDialog
              note={note.content}
              giver={item.giver}
              design={design}
              recipient={recipientAddress}
              returnAddress={returnAddress}
              disabled={pending}
            />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="ghost" disabled={pending}>
                  {busy === "regen" ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                  Regenerate
                  <ChevronDown data-icon="inline-end" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => handleRegenerate()}>
                  <RefreshCw data-icon="inline-start" />
                  Same tone
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRegenTone("current")
                    setRegenOpen(true)
                  }}
                >
                  <Sparkles data-icon="inline-start" />
                  Add context&hellip;
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Rewrite with a different tone</DropdownMenuLabel>
                {TONES.map((t) => (
                  <DropdownMenuItem key={t} onClick={() => handleRegenerate(t)}>
                    {TONE_LABELS[t]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Regenerate with context
                </DialogTitle>
                <DialogDescription>
                  Tell the AI how to rewrite this note to {item.giver}. Mention
                  anything to add, change, or emphasize.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`regen-${item.id}`}>Your instructions</Label>
                  <Textarea
                    id={`regen-${item.id}`}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="e.g. Mention we can't wait to see them at the holidays, keep it short, and thank them for traveling so far."
                    className="resize-none leading-relaxed"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`regen-tone-${item.id}`}>Tone</Label>
                  <Select
                    value={regenTone}
                    onValueChange={(v) => setRegenTone(v as Tone | "current")}
                  >
                    <SelectTrigger id={`regen-tone-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Keep current tone</SelectItem>
                      {TONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TONE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setRegenOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleRegenerate(
                      regenTone === "current" ? undefined : regenTone,
                      instructions,
                    )
                  }
                  disabled={pending || !instructions.trim()}
                >
                  {busy === "regen" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Sparkles data-icon="inline-start" />
                  )}
                  Regenerate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("font-medium", confidenceTone(item.giver_confidence))}>
              {item.giver_confidence}%
            </span>
            match
            {status !== "rejected" && status !== "sent" ? (
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleStatus("rejected", "Note rejected")}
                disabled={pending}
                aria-label="Reject note"
              >
                <X />
              </Button>
            ) : null}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}

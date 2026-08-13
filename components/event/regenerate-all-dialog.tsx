"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw, Sparkles } from "lucide-react"
import { regenerateAllNotes } from "@/app/actions/events"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
import { TONE_LABELS, type Tone } from "@/lib/types"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TONES = Object.keys(TONE_LABELS) as Tone[]

export function RegenerateAllDialog({
  eventId,
  count,
}: {
  eventId: string
  count: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [instructions, setInstructions] = useState("")
  const [tone, setTone] = useState<Tone | "current">("current")
  const [pending, startTransition] = useTransition()

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const result = await regenerateAllNotes(eventId, {
          tone: tone === "current" ? undefined : tone,
          instructions: instructions.trim() || undefined,
        })
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
        setOpen(false)
        setInstructions("")
        setTone("current")
        toast.success(
          result.count === 1
            ? "Rewrote 1 note"
            : `Rewrote all ${result.count} notes`,
        )
        router.refresh()
      } catch {
        toast.error("Couldn't regenerate the notes. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={count === 0}>
            <RefreshCw data-icon="inline-start" />
            Regenerate all
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Regenerate all notes
          </DialogTitle>
          <DialogDescription>
            Rewrite every note for this event at once. Add context to steer the
            overall feel — change the tone, the length, what to emphasize — and
            we&apos;ll apply it to all {count} {count === 1 ? "note" : "notes"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="regen-all-instructions">
              Context for every note{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="regen-all-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. Make them all a little warmer and less formal, keep them short, and mention how much the day meant to us."
              className="resize-none leading-relaxed"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="regen-all-tone">Tone</Label>
            <Select
              value={tone}
              onValueChange={(v) => setTone(v as Tone | "current")}
            >
              <SelectTrigger id="regen-all-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Keep each note&apos;s tone</SelectItem>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TONE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground text-pretty">
            This rewrites the wording of every unsent note and resets it to
            draft for review. Notes you&apos;ve already sent are left untouched.
          </p>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button onClick={handleRegenerate} disabled={pending || count === 0}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            Regenerate all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

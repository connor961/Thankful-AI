"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Gift as GiftIcon } from "lucide-react"
import { addManualGift } from "@/app/actions/events"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

export function ManualGiftDialog({ eventId, trigger }: { eventId: string; trigger: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [gift, setGift] = useState("")
  const [giver, setGiver] = useState("")
  const [relationship, setRelationship] = useState("")
  const [commentary, setCommentary] = useState("")

  function reset() {
    setGift("")
    setGiver("")
    setRelationship("")
    setCommentary("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gift.trim() || !giver.trim()) {
      toast.error("Add both the gift and who it's from")
      return
    }
    startTransition(async () => {
      try {
        const result = await addManualGift(eventId, {
          gift,
          giver,
          relationship,
          commentary,
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

        toast.success(`Added a gift from ${giver.trim()} and drafted the note`)
        setOpen(false)
        router.refresh()
      } catch {
        toast.error("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) reset()
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a gift manually</DialogTitle>
            <DialogDescription>
              No transcript? Enter the gift yourself and we&apos;ll draft a
              personalized thank-you note for it.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="my-4">
            <Field>
              <FieldLabel htmlFor="m-gift">Gift</FieldLabel>
              <Input
                id="m-gift"
                placeholder="Hand-knitted wool blanket"
                value={gift}
                onChange={(e) => setGift(e.target.value)}
                disabled={pending}
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="m-giver">Who it&apos;s from</FieldLabel>
              <Input
                id="m-giver"
                placeholder="Aunt Marie"
                value={giver}
                onChange={(e) => setGiver(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="m-rel">Relationship (optional)</FieldLabel>
              <Input
                id="m-rel"
                placeholder="Aunt"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="m-commentary">
                Notes for the AI (optional)
              </FieldLabel>
              <Textarea
                id="m-commentary"
                placeholder="She made it herself — we were so touched. Mention we'll use it in the nursery."
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={3}
                disabled={pending}
              />
              <FieldDescription>
                Anything you&apos;d like the note to mention — reactions,
                details, or plans for the gift.
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
                <GiftIcon data-icon="inline-start" />
              )}
              {pending ? "Drafting note..." : "Add & draft note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

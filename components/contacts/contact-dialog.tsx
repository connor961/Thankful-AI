"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createContact, updateContact } from "@/app/actions/contacts"
import type { Contact } from "@/lib/types"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactDialog({
  contact,
  defaults,
  trigger,
}: {
  contact?: Contact
  defaults?: Partial<Pick<Contact, "name" | "email" | "relationship" | "notes">>
  trigger: ReactNode
}) {
  const router = useRouter()
  const editing = Boolean(contact)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(contact?.name ?? defaults?.name ?? "")
  const [email, setEmail] = useState(contact?.email ?? defaults?.email ?? "")
  const [relationship, setRelationship] = useState(
    contact?.relationship ?? defaults?.relationship ?? "",
  )
  const [notes, setNotes] = useState(contact?.notes ?? defaults?.notes ?? "")
  const [line1, setLine1] = useState(contact?.address_line1 ?? "")
  const [line2, setLine2] = useState(contact?.address_line2 ?? "")
  const [city, setCity] = useState(contact?.city ?? "")
  const [stateReg, setStateReg] = useState(contact?.state ?? "")
  const [postal, setPostal] = useState(contact?.postal_code ?? "")
  const [country, setCountry] = useState(contact?.country ?? "")

  function reset() {
    setName(contact?.name ?? defaults?.name ?? "")
    setEmail(contact?.email ?? defaults?.email ?? "")
    setRelationship(contact?.relationship ?? defaults?.relationship ?? "")
    setNotes(contact?.notes ?? defaults?.notes ?? "")
    setLine1(contact?.address_line1 ?? "")
    setLine2(contact?.address_line2 ?? "")
    setCity(contact?.city ?? "")
    setStateReg(contact?.state ?? "")
    setPostal(contact?.postal_code ?? "")
    setCountry(contact?.country ?? "")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please enter a name")
      return
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      toast.error("Please enter a valid email address")
      return
    }
    startTransition(async () => {
      try {
        const input = {
          name,
          email,
          relationship,
          notes,
          address_line1: line1,
          address_line2: line2,
          city,
          state: stateReg,
          postal_code: postal,
          country,
        }
        if (editing && contact) {
          await updateContact(contact.id, input)
          toast.success("Contact updated")
        } else {
          await createContact(input)
          toast.success("Contact added")
        }
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this person's details."
                : "Save someone to your address book to reuse across events."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="my-4">
            <Field>
              <FieldLabel htmlFor="c-name">Name</FieldLabel>
              <Input
                id="c-name"
                placeholder="Aunt Marie"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-email">Email</FieldLabel>
              <Input
                id="c-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="marie@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-rel">Relationship</FieldLabel>
              <Input
                id="c-rel"
                placeholder="Aunt"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-notes">Notes</FieldLabel>
              <Textarea
                id="c-notes"
                placeholder="Anything worth remembering..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Field>

            <div className="flex flex-col gap-1 pt-1">
              <span className="text-sm font-medium text-foreground">
                Mailing address
              </span>
              <span className="text-xs text-muted-foreground text-pretty">
                Optional. Saved for printed cards so you won&apos;t have to
                write it out later.
              </span>
            </div>
            <Field>
              <FieldLabel htmlFor="c-line1">Street address</FieldLabel>
              <Input
                id="c-line1"
                autoComplete="off"
                placeholder="123 Maple Street"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-line2">
                Apt, suite, etc.{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                id="c-line2"
                autoComplete="off"
                placeholder="Apt 4B"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="c-city">City</FieldLabel>
                <Input
                  id="c-city"
                  autoComplete="off"
                  placeholder="Austin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-state">State / Region</FieldLabel>
                <Input
                  id="c-state"
                  autoComplete="off"
                  placeholder="TX"
                  value={stateReg}
                  onChange={(e) => setStateReg(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="c-postal">ZIP / Postal</FieldLabel>
                <Input
                  id="c-postal"
                  autoComplete="off"
                  placeholder="78701"
                  value={postal}
                  onChange={(e) => setPostal(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-country">
                  Country{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="c-country"
                  autoComplete="off"
                  placeholder="USA"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </Field>
            </div>
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
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {editing ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

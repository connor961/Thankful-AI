"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  MoreVertical,
  Users,
} from "lucide-react"
import { deleteContact } from "@/app/actions/contacts"
import type { Contact } from "@/lib/types"
import { initials, mailingAddressLines } from "@/lib/format"
import { ContactDialog } from "@/components/contacts/contact-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function ContactsView({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) =>
      [c.name, c.email, c.relationship, c.notes]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [contacts, query])

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Contacts
          </h1>
          <p className="text-muted-foreground text-pretty">
            Your address book. Saved people auto-fill their email when you send
            a matching thank-you note.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              aria-label="Search contacts"
            />
          </div>
          <ContactDialog
            trigger={
              <Button>
                <Plus data-icon="inline-start" />
                New contact
              </Button>
            }
          />
        </div>
      </div>

      {contacts.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No contacts yet</EmptyTitle>
            <EmptyDescription>
              Add the people you send thank-you notes to. We&apos;ll match them
              by name and fill in their email automatically.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ContactDialog
              trigger={
                <Button>
                  <Plus data-icon="inline-start" />
                  Add your first contact
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No contacts match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </section>
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteContact(contact.id)
        toast.success("Contact deleted")
        router.refresh()
      } catch {
        toast.error("Couldn't delete contact")
      }
    })
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials(contact.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium leading-tight">{contact.name}</span>
            {contact.relationship ? (
              <Badge variant="secondary" className="mt-1 w-fit">
                {contact.relationship}
              </Badge>
            ) : null}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 size-8"
                disabled={pending}
                aria-label={`Options for ${contact.name}`}
              >
                <MoreVertical />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <ContactDialog
                contact={contact}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 data-icon="inline-start" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {contact.email ? (
        <a
          href={`mailto:${contact.email}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mail className="size-3.5" />
          <span className="truncate">{contact.email}</span>
        </a>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground/60">
          <Mail className="size-3.5" />
          No email
        </span>
      )}

      {(() => {
        const lines = mailingAddressLines(contact)
        return lines.length > 0 ? (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <address className="not-italic leading-snug">
              {lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
        ) : null
      })()}

      {contact.notes ? (
        <p className="line-clamp-3 text-sm text-muted-foreground text-pretty">
          {contact.notes}
        </p>
      ) : null}
    </Card>
  )
}

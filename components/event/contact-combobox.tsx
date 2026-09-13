"use client"

import * as React from "react"
import { Autocomplete } from "@base-ui/react/autocomplete"
import { Mail, MapPin, UserRound } from "lucide-react"
import type { ContactPick } from "@/app/actions/contacts"
import { cn } from "@/lib/utils"

/**
 * A themed, searchable combobox over the user's saved contacts, used when
 * entering who a gift is from. It behaves like a normal text input — the user
 * can freely type a brand-new name — but surfaces matching saved contacts so
 * picking one guarantees the exact-name match that powers email/address reuse.
 *
 * `value`/`onValueChange` own the giver text; `onSelectContact` fires only when
 * a saved contact is chosen, so the caller can also reuse its relationship.
 */
export function ContactCombobox({
  contacts,
  value,
  onValueChange,
  onSelectContact,
  id,
  placeholder,
  disabled,
  autoFocus,
}: {
  contacts: ContactPick[]
  value: string
  onValueChange: (value: string) => void
  onSelectContact: (contact: ContactPick) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
}) {
  return (
    <Autocomplete.Root
      items={contacts}
      value={value}
      onValueChange={onValueChange}
      itemToStringValue={(c: ContactPick) => c.name}
      openOnInputClick
      mode="list"
    >
      <Autocomplete.Input
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30",
        )}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={4} className="isolate z-50">
          <Autocomplete.Popup
            className={cn(
              "max-h-[min(var(--available-height),18rem)] w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-lg bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <Autocomplete.Empty className="px-3 py-2 text-sm text-muted-foreground empty:m-0 empty:p-0">
              No saved contact matches — keep typing to add someone new.
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(contact: ContactPick) => (
                <Autocomplete.Item
                  key={contact.name}
                  value={contact}
                  onClick={() => onSelectContact(contact)}
                  className={cn(
                    "flex cursor-default items-center gap-2.5 px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  )}
                >
                  <UserRound className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">
                    {contact.name}
                  </span>
                  {contact.relationship ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {contact.relationship}
                    </span>
                  ) : null}
                  {contact.hasEmail ? (
                    <Mail
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Has email on file"
                    />
                  ) : null}
                  {contact.hasAddress ? (
                    <MapPin
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Has mailing address on file"
                    />
                  ) : null}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}

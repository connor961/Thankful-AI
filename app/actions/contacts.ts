"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { getUserId } from "@/lib/session"
import { hasMailingAddress } from "@/lib/format"
import type { Contact, LabelAddress } from "@/lib/types"

export type ContactInput = {
  name: string
  email: string
  relationship: string
  notes: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

export async function getContacts(): Promise<Contact[]> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT * FROM contacts
    WHERE user_id = ${userId}
    ORDER BY lower(name) ASC
  `) as Contact[]
  return rows
}

/**
 * Returns a lookup of lower-cased contact name -> email, for auto-filling
 * recipient addresses when a gift's giver matches a saved contact.
 */
export async function getContactEmailMap(): Promise<Record<string, string>> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT name, email FROM contacts
    WHERE user_id = ${userId} AND email <> ''
  `) as { name: string; email: string }[]
  const map: Record<string, string> = {}
  for (const r of rows) {
    map[r.name.trim().toLowerCase()] = r.email
  }
  return map
}

/**
 * Returns a lookup of lower-cased contact name -> mailing address, including
 * only contacts that actually have an address on file. Used to pre-fill printed
 * address labels for gift-givers who are saved in the address book.
 */
export async function getContactAddressMap(): Promise<
  Record<string, LabelAddress>
> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT name, address_line1, address_line2, city, state, postal_code, country
    FROM contacts
    WHERE user_id = ${userId}
  `) as {
    name: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    postal_code: string
    country: string
  }[]
  const map: Record<string, LabelAddress> = {}
  for (const r of rows) {
    if (!hasMailingAddress(r)) continue
    map[r.name.trim().toLowerCase()] = {
      name: r.name.trim(),
      line1: r.address_line1,
      line2: r.address_line2,
      city: r.city,
      state: r.state,
      postal_code: r.postal_code,
      country: r.country,
    }
  }
  return map
}

/**
 * Returns the set of saved contact names (lower-cased) so callers can tell
 * whether a given person is already in the address book.
 */
export async function getContactNames(): Promise<string[]> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT name FROM contacts WHERE user_id = ${userId}
  `) as { name: string }[]
  return rows.map((r) => r.name.trim().toLowerCase())
}

/** A compact contact for reuse pickers at gift-entry time. */
export type ContactPick = {
  name: string
  relationship: string
  hasEmail: boolean
  hasAddress: boolean
}

/**
 * Returns a lightweight, client-safe list of saved contacts for reuse when
 * adding gifts (name + relationship + whether we already have an email/address
 * on file). Deliberately omits full addresses so we don't ship every contact's
 * mailing details to the browser — those are resolved server-side by name at
 * print/send time. Sorted by name for a stable picker order.
 */
export async function getContactPickList(): Promise<ContactPick[]> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT name, relationship, email,
           address_line1, address_line2, city, state, postal_code, country
    FROM contacts
    WHERE user_id = ${userId}
    ORDER BY lower(name) ASC
  `) as {
    name: string
    relationship: string
    email: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    postal_code: string
    country: string
  }[]
  return rows.map((r) => ({
    name: r.name.trim(),
    relationship: r.relationship?.trim() ?? "",
    hasEmail: Boolean(r.email && r.email.trim()),
    hasAddress: hasMailingAddress(r),
  }))
}

export async function createContact(input: ContactInput): Promise<Contact> {
  const userId = await getUserId()
  const rows = (await sql`
    INSERT INTO contacts (
      user_id, name, email, relationship, notes,
      address_line1, address_line2, city, state, postal_code, country
    )
    VALUES (
      ${userId},
      ${input.name.trim()},
      ${input.email.trim()},
      ${input.relationship.trim()},
      ${input.notes.trim()},
      ${input.address_line1.trim()},
      ${input.address_line2.trim()},
      ${input.city.trim()},
      ${input.state.trim()},
      ${input.postal_code.trim()},
      ${input.country.trim()}
    )
    RETURNING *
  `) as Contact[]
  revalidatePath("/contacts")
  return rows[0]!
}

export async function updateContact(
  id: string,
  input: ContactInput,
): Promise<void> {
  const userId = await getUserId()
  await sql`
    UPDATE contacts
    SET name = ${input.name.trim()},
        email = ${input.email.trim()},
        relationship = ${input.relationship.trim()},
        notes = ${input.notes.trim()},
        address_line1 = ${input.address_line1.trim()},
        address_line2 = ${input.address_line2.trim()},
        city = ${input.city.trim()},
        state = ${input.state.trim()},
        postal_code = ${input.postal_code.trim()},
        country = ${input.country.trim()},
        updated_at = now()
    WHERE id = ${id} AND user_id = ${userId}
  `
  revalidatePath("/contacts")
}

export async function deleteContact(id: string): Promise<void> {
  const userId = await getUserId()
  await sql`
    DELETE FROM contacts WHERE id = ${id} AND user_id = ${userId}
  `
  revalidatePath("/contacts")
}

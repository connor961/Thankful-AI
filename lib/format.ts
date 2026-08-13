export function formatDate(date: string | Date | null): string {
  if (!date) return "No date set"
  // The Neon serverless driver returns `date` columns as JS `Date` objects (at
  // UTC midnight), but a plain "YYYY-MM-DD" or ISO string can also arrive. Handle
  // both, then format in UTC so the calendar day never shifts by the runtime's
  // timezone (a UTC-midnight date would otherwise render as the previous day in
  // negative-offset zones).
  const d =
    date instanceof Date ? date : new Date(`${date.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return "No date set"
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

/**
 * Formats a mailing address into standard postal lines, skipping any empty
 * fields. Returns one string per line (street, unit, "City, ST 12345",
 * country) so callers can render it however they like — a compact one-liner or
 * a stacked address block on a future printed card/envelope.
 */
export function mailingAddressLines(a: {
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}): string[] {
  const lines: string[] = []
  if (a.address_line1?.trim()) lines.push(a.address_line1.trim())
  if (a.address_line2?.trim()) lines.push(a.address_line2.trim())

  const city = a.city?.trim() ?? ""
  const state = a.state?.trim() ?? ""
  const postal = a.postal_code?.trim() ?? ""
  const cityState = [city, state].filter(Boolean).join(", ")
  const locality = [cityState, postal].filter(Boolean).join(" ")
  if (locality) lines.push(locality)

  if (a.country?.trim()) lines.push(a.country.trim())
  return lines
}

/** True when a contact/address has at least one meaningful field filled in. */
export function hasMailingAddress(a: {
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}): boolean {
  return mailingAddressLines(a).length > 0
}

export function initials(name: string): string {
  const parts = name.trim().split(/[\s&,]+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

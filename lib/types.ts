export type EventType =
  | "baby-shower"
  | "wedding"
  | "birthday"
  | "graduation"
  | "holiday"
  | "other"

export type Tone =
  | "warm"
  | "casual"
  | "elegant"
  | "funny"
  | "formal"
  | "religious"
  | "minimal"

export type NoteStatus = "draft" | "approved" | "rejected" | "sent"

/** Visual style used when rendering a note as an HTML email. */
export type EmailDesign = "classic" | "modern" | "playful"

export type EventRow = {
  id: string
  name: string
  event_type: EventType
  event_date: string | null
  recipient_names: string
  sender_signoff: string
  description: string
  tone: Tone
  email_design: EmailDesign
  status: string
  photo_url: string
  /** True for the one-click demo event seeded for new users. */
  is_sample: boolean
  created_at: string
}

export type GiftRow = {
  id: string
  event_id: string
  giver: string
  relationship: string
  gift: string
  reaction: string
  quote: string
  recipient_email: string
  giver_confidence: number
  gift_confidence: number
  needs_review: boolean
  position: number
  created_at: string
}

export type NoteRow = {
  id: string
  event_id: string
  gift_id: string
  content: string
  tone: Tone
  status: NoteStatus
  channel: string
  created_at: string
  updated_at: string
}

export type GiftWithNote = GiftRow & { note: NoteRow | null }

export type Contact = {
  id: string
  user_id: string
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
  created_at: string
  updated_at: string
}

/** A user's stored return address, used to pre-fill future mailings. */
export type UserSettings = {
  user_id: string
  return_name: string
  return_line1: string
  return_line2: string
  return_city: string
  return_state: string
  return_postal_code: string
  return_country: string
  created_at: string
  updated_at: string
}

/** A named mailing address, flattened for rendering on printed labels. */
export type LabelAddress = {
  name: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  "baby-shower": "Baby Shower",
  wedding: "Wedding",
  birthday: "Birthday",
  graduation: "Graduation",
  holiday: "Holiday",
  other: "Other",
}

export const TONE_LABELS: Record<Tone, string> = {
  warm: "Warm",
  casual: "Casual",
  elegant: "Elegant",
  funny: "Funny",
  formal: "Formal",
  religious: "Religious",
  minimal: "Minimal",
}

export const TONE_DESCRIPTIONS: Record<Tone, string> = {
  warm: "Heartfelt and affectionate",
  casual: "Friendly and relaxed",
  elegant: "Refined and graceful",
  funny: "Playful with light humor",
  formal: "Polished and respectful",
  religious: "Faith-centered and grateful",
  minimal: "Short and sincere",
}

export const EMAIL_DESIGN_LABELS: Record<EmailDesign, string> = {
  classic: "Classic",
  modern: "Modern",
  playful: "Playful",
}

export const EMAIL_DESIGN_DESCRIPTIONS: Record<EmailDesign, string> = {
  classic: "Warm greeting-card with serif type and a gold flourish",
  modern: "Clean and minimal with crisp sans-serif type",
  playful: "Bright and festive with color and rounded shapes",
}

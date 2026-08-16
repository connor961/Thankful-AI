"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { del, get } from "@vercel/blob"
import { sql } from "@/lib/db"
import { getUserId } from "@/lib/session"
import { canUploadMedia } from "@/lib/plans"
import {
  extractGiftsFromTranscript,
  generateThankYouNote,
  generateThankYouNotes,
  toAIError,
  transcribeAudio,
  type AIErrorCode,
} from "@/lib/ai"
import { sendNoteEmail } from "@/lib/email"
import {
  checkRateLimit,
  retryAfterPhrase,
  type RateLimitBucket,
} from "@/lib/rate-limit"
import {
  canSend,
  getUsage,
  hasAnyPass,
  recordNoteSend,
  effectivePlan,
  getSubscription,
} from "@/lib/billing"
import type {
  EmailDesign,
  EventRow,
  GiftRow,
  GiftWithNote,
  NoteRow,
  NoteStatus,
  Tone,
} from "@/lib/types"

/** Shared friendly message shown when a user hits their plan's note cap. */
function limitMessage(limit: number | null, lifetime = false): string {
  if (lifetime) {
    return `You've used all ${limit ?? 0} of your free notes. Upgrade to a plan or grab an Event Pass to keep going.`
  }
  return `You've reached your monthly limit of ${limit ?? 0} notes. Upgrade your plan to keep going.`
}

/**
 * Enforces a per-user rate limit on an expensive action and returns a ready-to-
 * return error object when throttled, or `null` to proceed. Keying on `userId`
 * (not IP) means the limit follows the account, so it can't be sidestepped by
 * switching networks. The `"rate_limited"` code slots into every action's
 * existing `{ ok: false; code; error }` union, and the client already renders
 * `error` verbatim, so no UI change is required.
 */
async function throttle(
  bucket: RateLimitBucket,
  userId: string,
): Promise<{ ok: false; code: "rate_limited"; error: string } | null> {
  const { success, retryAfter } = await checkRateLimit(bucket, userId)
  if (success) return null
  return {
    ok: false,
    code: "rate_limited",
    error: `You're doing that a bit too fast. Please try again in ${retryAfterPhrase(retryAfter)}.`,
  }
}

/**
 * The `id`/`event_id` columns are Postgres `uuid`s. If we hand a malformed
 * string (e.g. a stale or mistyped URL like /events/not-a-uuid) straight to a
 * query, Postgres throws `invalid input syntax for type uuid`, which bubbles up
 * as an unhandled server error / "this page couldn't load". Guarding first lets
 * callers treat a bad id as simply "not found".
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export type EventWithStats = EventRow & {
  gift_count: number
  approved_count: number
  sent_count: number
  review_count: number
}

/**
 * Verifies the given event belongs to the current user.
 * Throws when the event is missing or owned by someone else.
 */
async function assertEventOwner(eventId: string, userId: string): Promise<void> {
  if (!isUuid(eventId)) throw new Error("Not found")
  const rows = (await sql`
    SELECT id FROM events WHERE id = ${eventId} AND user_id = ${userId}
  `) as { id: string }[]
  if (!rows[0]) throw new Error("Not found")
}

export async function getEvents(): Promise<EventWithStats[]> {
  const userId = await getUserId()
  const rows = (await sql`
    SELECT
      e.*,
      COUNT(DISTINCT g.id)::int AS gift_count,
      COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'approved')::int AS approved_count,
      COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'sent')::int AS sent_count,
      COUNT(DISTINCT g.id) FILTER (WHERE g.needs_review = true)::int AS review_count
    FROM events e
    LEFT JOIN gifts g ON g.event_id = e.id
    LEFT JOIN notes n ON n.event_id = e.id
    WHERE e.user_id = ${userId}
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `) as EventWithStats[]
  return rows
}

export async function getEvent(id: string): Promise<EventRow | null> {
  if (!isUuid(id)) return null
  const userId = await getUserId()
  const rows = (await sql`
    SELECT * FROM events WHERE id = ${id} AND user_id = ${userId}
  `) as EventRow[]
  return rows[0] ?? null
}

export async function getGiftsWithNotes(
  eventId: string,
): Promise<GiftWithNote[]> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)
  const gifts = (await sql`
    SELECT * FROM gifts WHERE event_id = ${eventId}
    ORDER BY position ASC, created_at ASC
  `) as GiftRow[]
  const notes = (await sql`
    SELECT * FROM notes WHERE event_id = ${eventId}
  `) as NoteRow[]
  const noteByGift = new Map(notes.map((n) => [n.gift_id, n]))
  return gifts.map((g) => ({ ...g, note: noteByGift.get(g.id) ?? null }))
}

export async function createEvent(input: {
  name: string
  event_type: string
  event_date: string | null
  recipient_names: string
  sender_signoff: string
  description: string
  tone: Tone
  email_design: EmailDesign
}): Promise<string> {
  const userId = await getUserId()

  // Event Pass is a single-event product: a pass holder on the free plan may
  // only ever create one event. Paid subscribers are unaffected. Enforced here
  // server-side so it can't be bypassed from the client.
  const sub = await getSubscription(userId)
  if (effectivePlan(sub).id === "free" && (await hasAnyPass(userId))) {
    const existing = (await sql`
      SELECT COUNT(*)::int AS count FROM events
      WHERE user_id = ${userId} AND is_sample = false
    `) as { count: number }[]
    if ((existing[0]?.count ?? 0) >= 1) {
      throw new Error(
        "Your Event Pass covers one event. Upgrade to a subscription to create more.",
      )
    }
  }

  const rows = (await sql`
    INSERT INTO events (name, event_type, event_date, recipient_names, sender_signoff, description, tone, email_design, user_id)
    VALUES (
      ${input.name},
      ${input.event_type},
      ${input.event_date},
      ${input.recipient_names},
      ${input.sender_signoff},
      ${input.description},
      ${input.tone},
      ${input.email_design},
      ${userId}
    )
    RETURNING id
  `) as { id: string }[]
  revalidatePath("/")
  return rows[0].id
}

/**
 * The seeded content for the one-click sample event. Kept as a module constant
 * so the notes read as genuinely warm, specific examples (the "aha" moment for
 * a new user) rather than filler. Notes are stored as `draft` status, so they
 * never create `note_sends` rows and therefore never consume any of the user's
 * free-note allowance.
 */
const SAMPLE_GIFTS: {
  giver: string
  relationship: string
  gift: string
  reaction: string
  note: string
}[] = [
  {
    giver: "Aunt Miriam",
    relationship: "Aunt",
    gift: "KitchenAid stand mixer",
    reaction:
      "She remembered how much Sam loves to bake and teared up watching us open it.",
    note: "Dear Aunt Miriam, thank you so much for the KitchenAid stand mixer — we still smile remembering how you teared up watching us unwrap it. Sam put it to work the very first weekend on a batch of cinnamon rolls, and every time it hums to life on the counter we think of you. Thank you for knowing us so well. With love, Alex & Sam",
  },
  {
    giver: "The Patel Family",
    relationship: "Family friends",
    gift: "weekend cabin getaway",
    reaction: "A surprise voucher for a lake cabin — we can't wait to go.",
    note: "Dear Patel family, we are so touched by the weekend cabin getaway — what a thoughtful and generous surprise. After all the joyful chaos of the wedding, a couple of quiet days by the lake is exactly what we've been dreaming of, and we can't wait to unplug and soak it all in. Thank you for giving us a memory we'll hold onto for years. Warmly, Alex & Sam",
  },
  {
    giver: "Grandpa Lou",
    relationship: "Grandfather",
    gift: "handwritten family recipe book and cast-iron skillet",
    reaction: "His own recipes copied out by hand — we both cried.",
    note: "Dear Grandpa Lou, we don't quite have the words for how much the handwritten recipe book means to us — seeing your recipes in your own hand, paired with the cast-iron skillet, brought us both to tears. We can't wait to cook our way through every page and keep these traditions alive in our own kitchen. Thank you for this piece of our family's history. All our love, Alex & Sam",
  },
]

/**
 * Seeds a ready-made sample event (a wedding with three gifts and three drafted
 * thank-you notes) so a brand-new user can explore the full workflow instantly
 * — no data entry, no AI wait, and no cost to their free-note allowance since
 * the notes are drafts, not sends. Flagged `is_sample = true` so it can carry a
 * "Sample" badge, be excluded from the Event Pass one-event limit, and be
 * cleared whenever the user is ready to start for real.
 *
 * Idempotent-ish by design: if the user already has a sample, its id is
 * returned instead of creating a second one; if they already have real events,
 * we refuse (the entry point only appears on the empty dashboard anyway).
 */
export async function createSampleEvent(): Promise<string> {
  const userId = await getUserId()

  const existing = (await sql`
    SELECT id, is_sample FROM events WHERE user_id = ${userId}
  `) as { id: string; is_sample: boolean }[]
  const existingSample = existing.find((e) => e.is_sample)
  if (existingSample) return existingSample.id
  if (existing.length > 0) {
    throw new Error(
      "You already have events. Sample events are only for getting started.",
    )
  }

  const eventRows = (await sql`
    INSERT INTO events (
      name, event_type, event_date, recipient_names, sender_signoff,
      description, tone, email_design, user_id, is_sample
    )
    VALUES (
      ${"Sample: Alex & Sam's Wedding"},
      ${"wedding"},
      ${null},
      ${"Alex & Sam"},
      ${"Alex & Sam"},
      ${"This is a sample event so you can see how Thankful works end to end. The gifts and drafted notes below are examples — open one, tweak the wording, then delete this event whenever you're ready to start your own."},
      ${"warm"},
      ${"classic"},
      ${userId},
      ${true}
    )
    RETURNING id
  `) as { id: string }[]
  const eventId = eventRows[0].id

  for (let position = 0; position < SAMPLE_GIFTS.length; position++) {
    const g = SAMPLE_GIFTS[position]
    const giftRows = (await sql`
      INSERT INTO gifts (
        event_id, giver, relationship, gift, reaction, quote,
        giver_confidence, gift_confidence, needs_review, position
      )
      VALUES (
        ${eventId}, ${g.giver}, ${g.relationship}, ${g.gift}, ${g.reaction}, '',
        100, 100, false, ${position}
      )
      RETURNING id
    `) as { id: string }[]

    await sql`
      INSERT INTO notes (event_id, gift_id, content, tone, status)
      VALUES (${eventId}, ${giftRows[0].id}, ${g.note}, ${"warm"}, 'draft')
    `
  }

  revalidatePath("/")
  return eventId
}

/**
 * Edits an event's descriptive details after creation: name, occasion, date,
 * recipients, sign-off, tone, and the free-text context that steers AI notes.
 * Existing gifts and notes are untouched; new/regenerated notes pick up the new
 * context and tone. Scoped to the owner.
 */
export async function updateEventDetails(
  eventId: string,
  input: {
    name: string
    event_type: string
    event_date: string | null
    recipient_names: string
    sender_signoff: string
    description: string
    tone: Tone
    email_design: EmailDesign
  },
): Promise<void> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)

  const name = input.name.trim()
  if (!name) throw new Error("Please give your event a name")

  await sql`
    UPDATE events
    SET name = ${name},
        event_type = ${input.event_type},
        event_date = ${input.event_date},
        recipient_names = ${input.recipient_names.trim()},
        sender_signoff = ${input.sender_signoff.trim()},
        description = ${input.description.trim()},
        tone = ${input.tone},
        email_design = ${input.email_design}
    WHERE id = ${eventId} AND user_id = ${userId}
  `
  revalidatePath(`/events/${eventId}`)
  revalidatePath("/")
}

export async function updateEventPhoto(
  eventId: string,
  photoUrl: string,
): Promise<void> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)
  await sql`
    UPDATE events SET photo_url = ${photoUrl.trim()}
    WHERE id = ${eventId} AND user_id = ${userId}
  `
  revalidatePath(`/events/${eventId}`)
}

export async function deleteEvent(id: string): Promise<void> {
  const userId = await getUserId()
  await assertEventOwner(id, userId)
  await sql`DELETE FROM notes WHERE event_id = ${id}`
  await sql`DELETE FROM gifts WHERE event_id = ${id}`
  await sql`DELETE FROM events WHERE id = ${id} AND user_id = ${userId}`
  revalidatePath("/")
}

const REVIEW_THRESHOLD = 90

export type ProcessTranscriptResult =
  | { ok: true; giftsFound: number }
  | { ok: false; code: AIErrorCode | "limit_reached" | "rate_limited"; error: string }

export async function processTranscript(
  eventId: string,
  transcript: string,
): Promise<ProcessTranscriptResult> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)
  const event = await getEvent(eventId)
  if (!event) throw new Error("Event not found")

  const throttled = await throttle("ai", userId)
  if (throttled) return throttled

  const usage = await getUsage(userId)
  if (usage.atLimit) {
    return { ok: false, code: "limit_reached", error: limitMessage(usage.limit, usage.lifetime) }
  }

  // 1) Extract the gifts, then 2) draft every note in a SINGLE batched call.
  // Batching keeps the run fast and avoids the AI Gateway per-minute rate
  // limit (429s) that a call-per-gift loop trips on multi-gift events.
  let extracted
  let drafts
  try {
    extracted = await extractGiftsFromTranscript(transcript, event)
    if (extracted.length === 0) {
      return { ok: true, giftsFound: 0 }
    }
    drafts = await generateThankYouNotes(
      extracted.map((g) => ({
        giver: g.giver,
        relationship: g.relationship,
        gift: g.gift,
        reaction: g.reaction,
        quote: g.quote,
      })),
      event,
      event.tone,
    )
  } catch (err) {
    const aiError = toAIError(err)
    return { ok: false, code: aiError.code, error: aiError.message }
  }

  const noteByIndex = new Map(drafts.map((d) => [d.index, d.note]))

  for (let position = 0; position < extracted.length; position++) {
    const g = extracted[position]
    const needsReview =
      g.giverConfidence < REVIEW_THRESHOLD ||
      g.giftConfidence < REVIEW_THRESHOLD

    const giftRows = (await sql`
      INSERT INTO gifts (
        event_id, giver, relationship, gift, reaction, quote,
        giver_confidence, gift_confidence, needs_review, position
      )
      VALUES (
        ${eventId}, ${g.giver}, ${g.relationship}, ${g.gift}, ${g.reaction},
        ${g.quote}, ${Math.round(g.giverConfidence)}, ${Math.round(g.giftConfidence)},
        ${needsReview}, ${position}
      )
      RETURNING *
    `) as GiftRow[]
    const gift = giftRows[0]

    const noteContent =
      noteByIndex.get(position)?.trim() ||
      `Dear ${g.giver}, thank you so much for the ${g.gift}. It means a great deal to us. With gratitude, ${event.sender_signoff || event.recipient_names || ""}`.trim()

    await sql`
      INSERT INTO notes (event_id, gift_id, content, tone, status)
      VALUES (${eventId}, ${gift.id}, ${noteContent}, ${event.tone}, 'draft')
    `
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/")
  return { ok: true, giftsFound: extracted.length }
}

export type TranscribeMediaResult =
  | { ok: true; transcript: string }
  | {
      ok: false
      code: AIErrorCode | "not_entitled" | "empty" | "invalid" | "rate_limited"
      error: string
    }

/**
 * Transcribes an uploaded gift-opening recording (already sitting in Blob under
 * `event-media/<userId>/…`) into text, then deletes the blob. The transcript is
 * returned to the client for review �� it is NOT auto-processed — so the user can
 * fix any mis-hearings before `processTranscript` extracts gifts from it.
 *
 * The plan gate is re-checked here even though the upload token route also checks
 * it: never trust that the client only reached this action through the gated UI.
 */
export async function transcribeMedia(
  eventId: string,
  pathname: string,
): Promise<TranscribeMediaResult> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)

  const throttled = await throttle("ai", userId)
  if (throttled) return throttled

  const usage = await getUsage(userId)
  if (!canUploadMedia(usage.plan.id)) {
    return {
      ok: false,
      code: "not_entitled",
      error: "Video and audio upload is available on the Family and Pro plans.",
    }
  }

  // Media blobs are scoped by event; the caller already proved ownership of
  // `eventId` above, so require the blob to live under that event's prefix.
  const prefix = `event-media/${eventId}/`
  if (!pathname.startsWith(prefix)) {
    return { ok: false, code: "invalid", error: "Invalid upload path." }
  }

  try {
    const result = await get(pathname, { access: "private" })
    if (!result) {
      return { ok: false, code: "invalid", error: "Upload not found. Please try again." }
    }

    const buffer = new Uint8Array(await new Response(result.stream).arrayBuffer())
    const transcript = await transcribeAudio(buffer, mediaTypeFromPath(pathname))

    // The recording has served its purpose — remove it so we don't retain
    // users' personal media longer than the moment of transcription.
    await del(pathname).catch(() => {})

    if (!transcript) {
      return {
        ok: false,
        code: "empty",
        error: "We couldn't find any speech in that recording. Try a clearer file.",
      }
    }

    return { ok: true, transcript }
  } catch (err) {
    await del(pathname).catch(() => {})
    const aiError = toAIError(err)
    return { ok: false, code: aiError.code, error: aiError.message }
  }
}

/**
 * Maps a stored media pathname's extension to an IANA media type the
 * transcription provider understands. We rely on the extension (which the
 * upload route sets from the original filename and a validated content-type)
 * rather than sniffing bytes, because common containers like ID3-tagged mp3s
 * defeat magic-byte detection.
 */
function mediaTypeFromPath(pathname: string): string {
  const ext = pathname.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "mp3":
    case "mpeg":
    case "mpga":
      return "audio/mpeg"
    case "wav":
      return "audio/wav"
    case "ogg":
    case "oga":
      return "audio/ogg"
    case "m4a":
      return "audio/mp4"
    case "webm":
      return "audio/webm"
    case "mp4":
      return "video/mp4"
    default:
      return "audio/mpeg"
  }
}

export type AddManualGiftResult =
  | { ok: true }
  | { ok: false; code: AIErrorCode | "limit_reached" | "rate_limited"; error: string }

/**
 * Manually adds a single gift (when no transcript is available) and drafts its
 * thank-you note. The user's optional commentary is stored in `reaction` so it
 * both guides this draft and carries through any later regeneration. Manually
 * entered gifts are trusted (full confidence, no review flag).
 */
export async function addManualGift(
  eventId: string,
  input: {
    gift: string
    giver: string
    relationship?: string
    commentary?: string
  },
): Promise<AddManualGiftResult> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)
  const event = await getEvent(eventId)
  if (!event) throw new Error("Event not found")

  const gift = input.gift.trim()
  const giver = input.giver.trim()
  const relationship = input.relationship?.trim() ?? ""
  const commentary = input.commentary?.trim() ?? ""

  if (!gift || !giver) {
    return {
      ok: false,
      code: "generic",
      error: "Add both the gift and who it's from.",
    }
  }

  const throttled = await throttle("ai", userId)
  if (throttled) return throttled

  const usage = await getUsage(userId)
  if (usage.atLimit) {
    return { ok: false, code: "limit_reached", error: limitMessage(usage.limit, usage.lifetime) }
  }

  let noteContent: string
  try {
    noteContent = await generateThankYouNote(
      { giver, relationship, gift, reaction: commentary, quote: "" },
      event,
      event.tone,
    )
  } catch (err) {
    const aiError = toAIError(err)
    return { ok: false, code: aiError.code, error: aiError.message }
  }

  const posRows = (await sql`
    SELECT COALESCE(MAX(position), -1) + 1 AS next
    FROM gifts WHERE event_id = ${eventId}
  `) as { next: number }[]
  const position = posRows[0]?.next ?? 0

  const giftRows = (await sql`
    INSERT INTO gifts (
      event_id, giver, relationship, gift, reaction, quote,
      giver_confidence, gift_confidence, needs_review, position
    )
    VALUES (
      ${eventId}, ${giver}, ${relationship}, ${gift}, ${commentary}, '',
      100, 100, false, ${position}
    )
    RETURNING *
  `) as GiftRow[]
  const giftRow = giftRows[0]

  await sql`
    INSERT INTO notes (event_id, gift_id, content, tone, status)
    VALUES (${eventId}, ${giftRow.id}, ${noteContent}, ${event.tone}, 'draft')
  `

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/")
  return { ok: true }
}

export type BulkGiftInput = {
  gift: string
  giver: string
  relationship?: string
  commentary?: string
}

export type AddManualGiftsBulkResult =
  | { ok: true; added: number }
  | { ok: false; code: AIErrorCode | "limit_reached" | "rate_limited"; error: string }

/**
 * Manually adds MANY gifts at once (when no transcript is available) and drafts
 * every thank-you note in a SINGLE batched AI call. Rows missing a gift or giver
 * are skipped. Like the single manual add, entries are trusted (full confidence,
 * no review flag) and each row's optional commentary is stored in `reaction` so
 * it guides the draft and any later regeneration.
 */
export async function addManualGiftsBulk(
  eventId: string,
  rows: BulkGiftInput[],
): Promise<AddManualGiftsBulkResult> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)
  const event = await getEvent(eventId)
  if (!event) throw new Error("Event not found")

  // Normalize + drop empty rows (a row needs both a gift and a giver).
  const clean = rows
    .map((r) => ({
      gift: r.gift.trim(),
      giver: r.giver.trim(),
      relationship: r.relationship?.trim() ?? "",
      commentary: r.commentary?.trim() ?? "",
    }))
    .filter((r) => r.gift && r.giver)

  if (clean.length === 0) {
    return {
      ok: false,
      code: "generic",
      error: "Add at least one row with both a gift and who it's from.",
    }
  }

  const throttled = await throttle("ai", userId)
  if (throttled) return throttled

  const usage = await getUsage(userId)
  if (usage.atLimit) {
    return { ok: false, code: "limit_reached", error: limitMessage(usage.limit, usage.lifetime) }
  }

  // Draft every note in one call to stay fast and dodge per-minute rate limits.
  let drafts
  try {
    drafts = await generateThankYouNotes(
      clean.map((r) => ({
        giver: r.giver,
        relationship: r.relationship,
        gift: r.gift,
        reaction: r.commentary,
        quote: "",
      })),
      event,
      event.tone,
    )
  } catch (err) {
    // Nothing is written until drafting succeeds, so no orphan gifts remain.
    const aiError = toAIError(err)
    return { ok: false, code: aiError.code, error: aiError.message }
  }

  const noteByIndex = new Map(drafts.map((d) => [d.index, d.note]))

  const posRows = (await sql`
    SELECT COALESCE(MAX(position), -1) + 1 AS next
    FROM gifts WHERE event_id = ${eventId}
  `) as { next: number }[]
  let position = posRows[0]?.next ?? 0

  for (let i = 0; i < clean.length; i++) {
    const r = clean[i]
    const giftRows = (await sql`
      INSERT INTO gifts (
        event_id, giver, relationship, gift, reaction, quote,
        giver_confidence, gift_confidence, needs_review, position
      )
      VALUES (
        ${eventId}, ${r.giver}, ${r.relationship}, ${r.gift}, ${r.commentary}, '',
        100, 100, false, ${position}
      )
      RETURNING *
    `) as GiftRow[]
    const giftRow = giftRows[0]

    const noteContent =
      noteByIndex.get(i)?.trim() ||
      `Dear ${r.giver}, thank you so much for the ${r.gift}. It means a great deal to us. With gratitude, ${event.sender_signoff || event.recipient_names || ""}`.trim()

    await sql`
      INSERT INTO notes (event_id, gift_id, content, tone, status)
      VALUES (${eventId}, ${giftRow.id}, ${noteContent}, ${event.tone}, 'draft')
    `
    position++
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/")
  return { ok: true, added: clean.length }
}

export type RegenerateNoteResult =
  | { ok: true }
  | { ok: false; code: AIErrorCode | "limit_reached" | "rate_limited"; error: string }

export async function regenerateNote(
  noteId: string,
  tone?: Tone,
  instructions?: string,
): Promise<RegenerateNoteResult> {
  const userId = await getUserId()
  const noteRows = (await sql`
    SELECT n.* FROM notes n
    JOIN events e ON e.id = n.event_id
    WHERE n.id = ${noteId} AND e.user_id = ${userId}
  `) as NoteRow[]
  const note = noteRows[0]
  if (!note) throw new Error("Note not found")

  const event = await getEvent(note.event_id)
  if (!event) throw new Error("Event not found")

  const throttled = await throttle("ai", userId)
  if (throttled) return throttled

  const usage = await getUsage(userId)
  if (usage.atLimit) {
    return { ok: false, code: "limit_reached", error: limitMessage(usage.limit, usage.lifetime) }
  }

  const giftRows = (await sql`SELECT * FROM gifts WHERE id = ${note.gift_id}`) as GiftRow[]
  const gift = giftRows[0]
  if (!gift) throw new Error("Gift not found")

  const nextTone = tone ?? note.tone
  let content: string
  try {
    content = await generateThankYouNote(gift, event, nextTone, instructions)
  } catch (err) {
    const aiError = toAIError(err)
    return { ok: false, code: aiError.code, error: aiError.message }
  }

  await sql`
    UPDATE notes
    SET content = ${content}, tone = ${nextTone}, status = 'draft', updated_at = now()
    WHERE id = ${noteId}
  `
  revalidatePath(`/events/${note.event_id}`)
  return { ok: true }
}

export type RegenerateAllNotesResult =
  | { ok: true; count: number }
  | {
      ok: false
      code: AIErrorCode | "limit_reached" | "rate_limited" | "empty"
      error: string
    }

/**
 * Rewrites EVERY note for an event in one batched model call, applying an
 * optional tone change and/or free-text instructions to all of them at once.
 * This is the "I don't like the overall feel — redo them all" escape hatch, so
 * the user never has to regenerate note-by-note. Batching (one call, not one
 * per note) keeps it fast and dodges the AI Gateway per-minute rate limit.
 */
export async function regenerateAllNotes(
  eventId: string,
  opts?: { tone?: Tone; instructions?: string },
): Promise<RegenerateAllNotesResult> {
  const userId = await getUserId()
  await assertEventOwner(eventId, userId)

  const event = await getEvent(eventId)
  if (!event) throw new Error("Event not found")

  const throttled = await throttle("ai", userId)
  if (throttled) return throttled

  const usage = await getUsage(userId)
  if (usage.atLimit) {
    return { ok: false, code: "limit_reached", error: limitMessage(usage.limit, usage.lifetime) }
  }

  // One note per gift; order by the gift timeline so indices are stable.
  // Already-sent notes are left untouched — the recipient has the old wording,
  // so we never silently rewrite what's out the door.
  const rows = (await sql`
    SELECT
      n.id AS note_id,
      g.giver, g.relationship, g.gift, g.reaction, g.quote
    FROM notes n
    JOIN gifts g ON g.id = n.gift_id
    WHERE n.event_id = ${eventId}
      AND n.status <> 'sent'
    ORDER BY g.position ASC, g.created_at ASC
  `) as {
    note_id: string
    giver: string
    relationship: string
    gift: string
    reaction: string
    quote: string
  }[]

  if (rows.length === 0) {
    return {
      ok: false,
      code: "empty",
      error: "There are no unsent notes to regenerate.",
    }
  }

  const nextTone = opts?.tone ?? event.tone

  let drafts
  try {
    drafts = await generateThankYouNotes(
      rows.map((r) => ({
        giver: r.giver,
        relationship: r.relationship,
        gift: r.gift,
        reaction: r.reaction,
        quote: r.quote,
      })),
      event,
      nextTone,
      opts?.instructions,
    )
  } catch (err) {
    const aiError = toAIError(err)
    return { ok: false, code: aiError.code, error: aiError.message }
  }

  const noteByIndex = new Map(drafts.map((d) => [d.index, d.note]))

  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const content = noteByIndex.get(i)?.trim()
    if (!content) continue
    await sql`
      UPDATE notes
      SET content = ${content}, tone = ${nextTone}, status = 'draft', updated_at = now()
      WHERE id = ${rows[i].note_id}
    `
    count++
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/")
  return { ok: true, count }
}

export async function updateNoteContent(
  noteId: string,
  content: string,
): Promise<void> {
  const userId = await getUserId()
  const rows = (await sql`
    UPDATE notes SET content = ${content}, updated_at = now()
    WHERE id = ${noteId}
      AND event_id IN (SELECT id FROM events WHERE user_id = ${userId})
    RETURNING event_id
  `) as { event_id: string }[]
  if (rows[0]) revalidatePath(`/events/${rows[0].event_id}`)
}

export async function setNoteStatus(
  noteId: string,
  status: NoteStatus,
): Promise<void> {
  const userId = await getUserId()
  const rows = (await sql`
    UPDATE notes SET status = ${status}, updated_at = now()
    WHERE id = ${noteId}
      AND event_id IN (SELECT id FROM events WHERE user_id = ${userId})
    RETURNING event_id
  `) as { event_id: string }[]
  if (rows[0]) revalidatePath(`/events/${rows[0].event_id}`)
}

export async function updateGift(
  giftId: string,
  fields: { giver: string; gift: string; relationship: string },
): Promise<void> {
  const userId = await getUserId()
  const rows = (await sql`
    UPDATE gifts
    SET giver = ${fields.giver},
        gift = ${fields.gift},
        relationship = ${fields.relationship},
        giver_confidence = 100,
        gift_confidence = 100,
        needs_review = false
    WHERE id = ${giftId}
      AND event_id IN (SELECT id FROM events WHERE user_id = ${userId})
    RETURNING event_id
  `) as { event_id: string }[]
  if (rows[0]) revalidatePath(`/events/${rows[0].event_id}`)
}

export async function updateGiftEmail(
  giftId: string,
  email: string,
): Promise<void> {
  const userId = await getUserId()
  const rows = (await sql`
    UPDATE gifts
    SET recipient_email = ${email.trim()}
    WHERE id = ${giftId}
      AND event_id IN (SELECT id FROM events WHERE user_id = ${userId})
    RETURNING event_id
  `) as { event_id: string }[]
  if (rows[0]) revalidatePath(`/events/${rows[0].event_id}`)
}

export type SendNoteResult =
  | { ok: true }
  | { ok: false; error: string; code?: "limit_reached" | "rate_limited" }

/**
 * Emails a note to its gift's recipient and, on success, marks it as sent.
 * Scoped to the current user via the events join.
 */
export async function sendNote(noteId: string): Promise<SendNoteResult> {
  const userId = await getUserId()

  const throttled = await throttle("email", userId)
  if (throttled) return throttled

  const rows = (await sql`
    SELECT
      n.id AS note_id, n.content, n.event_id, n.status,
      g.giver, g.recipient_email,
      e.photo_url, e.email_design
    FROM notes n
    JOIN gifts g ON g.id = n.gift_id
    JOIN events e ON e.id = n.event_id
    WHERE n.id = ${noteId} AND e.user_id = ${userId}
  `) as {
    note_id: string
    content: string
    event_id: string
    status: NoteStatus
    giver: string
    recipient_email: string
    photo_url: string
    email_design: EmailDesign
  }[]
  const row = rows[0]
  if (!row) return { ok: false, error: "Note not found." }

  if (!row.recipient_email?.trim()) {
    return {
      ok: false,
      error: `Add an email address for ${row.giver} before sending.`,
    }
  }

  // Only a first-time send counts against the plan limit; re-sending an already
  // sent note is free and doesn't re-check the cap.
  const isFirstSend = row.status !== "sent"
  if (isFirstSend && !(await canSend(userId))) {
    const usage = await getUsage(userId)
    return {
      ok: false,
      code: "limit_reached",
      error: limitMessage(usage.limit, usage.lifetime),
    }
  }

  // Emails need an absolute, publicly reachable image URL. The stored value is
  // a private blob pathname served through our public delivery route.
  let photoUrl: string | undefined
  if (row.photo_url) {
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host")
    const proto = h.get("x-forwarded-proto") ?? "https"
    if (host) {
      photoUrl = `${proto}://${host}/api/event-photo/view?pathname=${encodeURIComponent(
        row.photo_url,
      )}`
    }
  }

  const result = await sendNoteEmail({
    to: row.recipient_email,
    subject: row.giver ? `Thank you, ${row.giver}!` : "A thank-you note for you",
    note: row.content,
    photoUrl,
    design: row.email_design,
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  await sql`
    UPDATE notes SET status = 'sent', updated_at = now()
    WHERE id = ${noteId}
  `
  // Meter only first-time sends so the usage ledger matches billable activity.
  if (isFirstSend) {
    await recordNoteSend(userId, noteId)
  }
  revalidatePath(`/events/${row.event_id}`)
  revalidatePath("/")
  return { ok: true }
}

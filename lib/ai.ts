import "server-only"
import { gateway, generateText, Output } from "ai"
import { z } from "zod"
import { EVENT_TYPE_LABELS, TONE_DESCRIPTIONS, type EventRow } from "./types"

const MODEL = "openai/gpt-5-mini"

/**
 * Transcription model served through the AI Gateway (zero-config, same as the
 * text model). Whisper accepts the widest range of audio/video containers
 * (mp3/mp4/m4a/wav/webm/ogg) directly from raw bytes — the newer
 * gpt-4o-transcribe endpoint is stricter and rejects uploads without a filename.
 */
const TRANSCRIBE_MODEL = "openai/whisper-1"

/**
 * Formats the sender's optional event context into a prompt block. This is the
 * free-text "vibe" a user provides about their event (the inside jokes, the
 * mood, who the crowd is) and is the strongest lever they have over how notes
 * read. Returns an empty string when no context was given.
 */
function eventContextBlock(description?: string): string {
  const ctx = description?.trim()
  if (!ctx) return ""
  return `\nContext about this event from the host (use it to shape the voice, details, and vibe of the notes; weave it in naturally and never quote it verbatim):\n"""\n${ctx}\n"""\n`
}

export type AIErrorCode = "billing" | "unauthorized" | "generic"

export class AIError extends Error {
  code: AIErrorCode
  constructor(code: AIErrorCode, message: string) {
    super(message)
    this.name = "AIError"
    this.code = code
  }
}

/**
 * Translates an unknown error thrown by the AI Gateway / SDK into a typed
 * AIError with a user-facing message. This lets the UI explain *why* note
 * generation failed instead of showing a generic "try again".
 */
export function toAIError(err: unknown): AIError {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : ""
  const statusCode =
    typeof err === "object" && err !== null && "statusCode" in err
      ? (err as { statusCode?: number }).statusCode
      : undefined
  const haystack = `${raw} ${JSON.stringify(err ?? "")}`.toLowerCase()

  if (
    haystack.includes("credit card") ||
    haystack.includes("customer_verification_required") ||
    haystack.includes("add a card")
  ) {
    return new AIError(
      "billing",
      "AI note generation is disabled until a credit card is added to your Vercel team's AI Gateway. Add one to unlock free credits, then try again.",
    )
  }

  if (statusCode === 401 || statusCode === 403) {
    return new AIError(
      "unauthorized",
      "The AI Gateway rejected the request. Check that your Vercel AI Gateway is configured, then try again.",
    )
  }

  return new AIError(
    "generic",
    "Something went wrong while generating notes. Please try again.",
  )
}

/**
 * Transcribes an uploaded audio/video recording to plain text. The returned
 * transcript is fed into the exact same extraction pipeline as a pasted one.
 *
 * We call the transcription model's `doGenerate` directly instead of the SDK's
 * high-level `transcribe()` helper on purpose: `transcribe()` derives the media
 * type purely from the file's magic bytes and silently falls back to
 * "audio/wav" when detection fails. Most real-world mp3s begin with an ID3 tag
 * (not the frame-sync bytes the SDK looks for), so that detection mislabels
 * them as wav and the provider rejects the format mismatch. Here we pass the
 * caller-supplied `mediaType` (derived from the actual upload) so the provider
 * always gets the truth.
 */
export async function transcribeAudio(
  audio: Uint8Array,
  mediaType: string,
): Promise<string> {
  const result = await gateway.transcription(TRANSCRIBE_MODEL).doGenerate({
    audio,
    mediaType,
    providerOptions: {},
  })
  return result.text.trim()
}

const extractionSchema = z.object({
  gifts: z.array(
    z.object({
      giver: z
        .string()
        .describe("Name of the person or people who gave the gift"),
      relationship: z
        .string()
        .describe(
          "Relationship to the recipient if mentioned or inferable (e.g. Grandmother, College friend, Coworker). Empty string if unknown.",
        ),
      gift: z
        .string()
        .describe(
          "Specific description of the gift, including brand/color/quantity if mentioned",
        ),
      reaction: z
        .string()
        .describe("Short summary of the recipient's emotional reaction"),
      quote: z
        .string()
        .describe(
          "A memorable verbatim quote from the moment, if any. Empty string if none.",
        ),
      giverConfidence: z
        .number()
        .min(0)
        .max(100)
        .describe("Confidence (0-100) that the giver is correctly identified"),
      giftConfidence: z
        .number()
        .min(0)
        .max(100)
        .describe("Confidence (0-100) that the gift is correctly identified"),
    }),
  ),
})

export type ExtractedGift = z.infer<typeof extractionSchema>["gifts"][number]

export async function extractGiftsFromTranscript(
  transcript: string,
  event: Pick<
    EventRow,
    "name" | "event_type" | "recipient_names" | "description"
  >,
): Promise<ExtractedGift[]> {
  const { output } = await generateText({
    model: MODEL,
    maxRetries: 3,
    output: Output.object({ schema: extractionSchema }),
    prompt: `You are analyzing a transcript from a gift-opening event and extracting a structured registry of gifts.

Event: "${event.name}" (${EVENT_TYPE_LABELS[event.event_type] ?? event.event_type})
Recipient(s): ${event.recipient_names || "the recipient"}
${eventContextBlock(event.description)}
For every distinct gift opened, extract the giver, their relationship, the specific gift, the recipient's reaction, and a memorable quote. Be specific about gifts (e.g. "Blue Baby Brezza Formula Pro" not "baby item"). If the giver or gift is uncertain, lower the confidence accordingly. Only include gifts that are actually opened or given in the transcript.

Transcript:
"""
${transcript}
"""`,
  })

  return output.gifts
}

export async function generateThankYouNote(
  gift: {
    giver: string
    relationship: string
    gift: string
    reaction: string
    quote: string
  },
  event: Pick<
    EventRow,
    "name" | "event_type" | "recipient_names" | "sender_signoff" | "description"
  >,
  tone: keyof typeof TONE_DESCRIPTIONS,
  instructions?: string,
): Promise<string> {
  const extra = instructions?.trim()
  const { output } = await generateText({
    model: MODEL,
    maxRetries: 3,
    output: Output.object({
      schema: z.object({
        note: z.string().describe("The full thank-you note text"),
      }),
    }),
    prompt: `Write a personalized thank-you note for a ${
      EVENT_TYPE_LABELS[event.event_type] ?? event.event_type
    }.

Tone: ${tone} — ${TONE_DESCRIPTIONS[tone]}
From: ${event.sender_signoff || event.recipient_names || "the recipient"}
To: ${gift.giver}${gift.relationship ? ` (${gift.relationship})` : ""}
Gift: ${gift.gift}
Their reaction: ${gift.reaction}
${gift.quote ? `Memorable quote from the moment: "${gift.quote}"` : ""}
${eventContextBlock(event.description)}${
  extra
    ? `\nSpecial instructions from the sender (follow these closely, but keep the note natural and never mention these instructions): ${extra}\n`
    : ""
}
Write a sincere, specific note that references the actual gift and the genuine reaction. Match the relationship's warmth. Keep it to 3-5 sentences.

Format it like a real card. Open with the greeting ("Dear ...,") on its OWN line, then a blank line before the body begins. After the body, add a blank line, then the sign-off and the sender name on their OWN separate lines. For example:

Dear Taylor,

<body>

Warmly,
${event.sender_signoff || event.recipient_names || "the sender"}

Do not use placeholders or brackets — write it as if ready to send.`,
  })

  return output.note.trim()
}

export type NoteDraft = { index: number; note: string }

/**
 * Generates thank-you notes for many gifts in a SINGLE model call. Doing this
 * as one request (instead of one call per gift) keeps note generation fast and
 * avoids tripping the AI Gateway's per-minute rate limit (429s) when an event
 * has several gifts.
 */
export async function generateThankYouNotes(
  gifts: {
    giver: string
    relationship: string
    gift: string
    reaction: string
    quote: string
  }[],
  event: Pick<
    EventRow,
    "name" | "event_type" | "recipient_names" | "sender_signoff" | "description"
  >,
  tone: keyof typeof TONE_DESCRIPTIONS,
  instructions?: string,
): Promise<NoteDraft[]> {
  if (gifts.length === 0) return []
  const extra = instructions?.trim()

  const giftList = gifts
    .map(
      (g, i) =>
        `Gift ${i} —
  To: ${g.giver}${g.relationship ? ` (${g.relationship})` : ""}
  Gift: ${g.gift}
  Their reaction: ${g.reaction}
  ${g.quote ? `Memorable quote: "${g.quote}"` : "No memorable quote"}`,
    )
    .join("\n\n")

  const { output } = await generateText({
    model: MODEL,
    maxRetries: 3,
    output: Output.object({
      schema: z.object({
        notes: z.array(
          z.object({
            index: z
              .number()
              .describe("The Gift number this note is for (matches the input)"),
            note: z.string().describe("The full thank-you note text"),
          }),
        ),
      }),
    }),
    prompt: `Write a personalized thank-you note for each gift below, for a ${
      EVENT_TYPE_LABELS[event.event_type] ?? event.event_type
    }.

Tone for every note: ${tone} — ${TONE_DESCRIPTIONS[tone]}
Signed by: ${event.sender_signoff || event.recipient_names || "the recipient"}
${eventContextBlock(event.description)}${
      extra
        ? `\nSpecial instructions from the sender — apply these to EVERY note (follow them closely, but keep each note natural and never mention these instructions): ${extra}\n`
        : ""
    }
For each gift, write a sincere, specific note that references the actual gift and the genuine reaction. Match the relationship's warmth. Keep each to 3-5 sentences.

Format each note like a real card. Open with the greeting ("Dear ...,") on its OWN line, then a blank line before the body begins. After the body, add a blank line, then the sign-off and the sender name on their OWN separate lines (e.g. a line "Warmly," then a line "${event.sender_signoff || event.recipient_names || "the sender"}"). Do not use placeholders or brackets — write each as if ready to send. Return exactly one note per gift, using the same Gift number as its index.

Gifts:
${giftList}`,
  })

  return output.notes
}

/**
 * Sign-off formatting shared by every surface that renders a thank-you note
 * (the review card, the send-preview, the printable fold card, and the actual
 * email). Notes are stored as a single free-text string, and the model often
 * ends them inline, e.g. "...glad you came. Cheers, Connor". Readers expect the
 * closing to sit on its own lines like a real card:
 *
 *     ...glad you came.
 *
 *     Cheers,
 *     Connor
 *
 * `formatNoteForDisplay` detects a trailing "<sign-off>, <name>" and lifts it
 * onto its own paragraph, with the sign-off and the name on separate lines. It
 * is deliberately conservative — it only acts when it finds a known closing
 * phrase followed by a comma and a short name at the very end of the note, so
 * ordinary sentences are never reflowed. It is also idempotent: running it on
 * an already-formatted note yields the same result.
 */

// Known closings, longest first so the fullest phrase wins (e.g. we prefer
// "with love and gratitude" over just "love"). All matching is case-insensitive.
const SIGN_OFFS = [
  "with warmth and gratitude",
  "with love and gratitude",
  "with heartfelt gratitude",
  "with heartfelt thanks",
  "with deepest gratitude",
  "with much appreciation",
  "with much gratitude",
  "with all my love",
  "with warmest regards",
  "with warm regards",
  "with gratitude",
  "with appreciation",
  "with blessings",
  "with warmth",
  "warmest regards",
  "warm regards",
  "kind regards",
  "best regards",
  "all the best",
  "best wishes",
  "sincerely yours",
  "yours sincerely",
  "yours truly",
  "thank you again",
  "thank you so much",
  "thanks so much",
  "thanks again",
  "many thanks",
  "lots of love",
  "love always",
  "all my love",
  "much love",
  "hugs and love",
  "god bless",
  "take care",
  "gratefully",
  "sincerely",
  "blessings",
  "warmly",
  "fondly",
  "cheers",
  "regards",
  "thank you",
  "thanks",
  "hugs",
  "xoxo",
  "love",
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const SIGN_OFF_ALT = SIGN_OFFS.map(escapeRegExp).join("|")

// <body ending in sentence punctuation or a line break><sep><sign-off>, <name><end>
// The required comma right after the sign-off is the key guard against
// reflowing an ordinary closing sentence (e.g. "...I can't thank you enough").
const TRAILING_SIGN_OFF = new RegExp(
  `^([\\s\\S]*?[.!?…"”'’)\\]\\n])\\s*(${SIGN_OFF_ALT})\\s*,\\s+([^\\n.!?,]{1,40})\\.?\\s*$`,
  "i",
)

// Known opening greetings, longest first so the fullest phrase wins.
const GREETINGS = ["dearest", "dear", "hello", "hey there", "hey", "hi"]
const GREETING_ALT = GREETINGS.map(escapeRegExp).join("|")

// <greeting> <name>,<sep><rest>
// Anchored at the very start. The name is a short, comma/newline-free run, and
// the trailing comma is required — this keeps us from touching a note that
// happens to open with one of these words in ordinary prose. The `\s+` after
// the comma also swallows an existing blank line, so re-running is a no-op.
const LEADING_GREETING = new RegExp(
  `^(${GREETING_ALT})\\s+([^\\n,]{1,40}),\\s+(\\S[\\s\\S]*)$`,
  "i",
)

/** Lifts a leading "Dear [Name]," onto its own line, with a blank line after. */
function formatGreeting(text: string): string {
  const match = text.match(LEADING_GREETING)
  if (!match) return text

  const greeting = match[1].trim()
  const name = match[2].trim()
  const rest = match[3].trim()
  if (!name || !rest) return text

  // Normalize the greeting word's capitalization (e.g. "dear" -> "Dear").
  const greetingCased =
    greeting.charAt(0).toUpperCase() + greeting.slice(1).toLowerCase()

  return `${greetingCased} ${name},\n\n${rest}`
}

/** Lifts a trailing "<sign-off>, <name>" onto its own spaced lines. */
function formatSignOff(text: string): string {
  const match = text.match(TRAILING_SIGN_OFF)
  if (!match) return text

  const body = match[1].trim()
  const signOff = match[2].trim()
  const name = match[3].trim()
  // Guard against a note that is *only* a closing — nothing to lift out.
  if (!body || !name) return text

  return `${body}\n\n${signOff},\n${name}`
}

export function formatNoteForDisplay(content: string): string {
  const text = (content ?? "").replace(/\r\n/g, "\n").trim()
  if (!text) return text

  // Greeting first, then sign-off, so each operates on cleanly-trimmed text.
  return formatSignOff(formatGreeting(text))
}

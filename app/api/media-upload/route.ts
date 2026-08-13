import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getUsage } from "@/lib/billing"
import { canUploadMedia } from "@/lib/plans"
import { sql } from "@/lib/db"

/** Hard cap on uploads. The transcription model rejects files above ~25 MB. */
const MAX_BYTES = 25 * 1024 * 1024

/**
 * Media types the transcription model can read AND the AI SDK can detect from
 * magic bytes (mp3/mpeg/ogg/wav/mp4/webm). We keep this list tight so users get
 * a clear rejection up front instead of a confusing transcription failure later.
 */
const ALLOWED_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "video/mp4",
  "video/webm",
]

/**
 * Uploads a gift-opening recording to private Blob storage and returns its
 * pathname. The browser POSTs the file here (a Route Handler, so it is NOT
 * subject to the 1 MB Server Action body limit) and we `put()` it server-side.
 *
 * We deliberately do NOT use the @vercel/blob client-upload flow: it relies on
 * an upload-completion callback URL that cannot be resolved in some preview/dev
 * environments, which hangs the upload. Files are capped at 25 MB, so a direct
 * server-side put is simple and reliable.
 *
 * The plan gate lives here (not just in the UI): a user whose plan doesn't
 * include media upload is rejected, so the feature can't be unlocked by
 * tampering with the client.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "You must be signed in to upload." }, { status: 401 })
  }

  const usage = await getUsage(session.user.id)
  if (!canUploadMedia(usage.plan.id)) {
    return NextResponse.json(
      { error: "Video and audio upload is available on the Family and Pro plans." },
      { status: 403 },
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const eventId = formData.get("eventId") as string | null

    if (!file || !eventId) {
      return NextResponse.json({ error: "Missing file or event." }, { status: 400 })
    }
    if (file.type && !ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload an MP4/WebM video or MP3/WAV/M4A/OGG audio." },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That file is over the 25 MB limit. Try a shorter clip." },
        { status: 400 },
      )
    }

    // Confirm the requester owns the event before writing under its prefix.
    const rows = (await sql`
      SELECT id FROM events WHERE id = ${eventId} AND user_id = ${session.user.id}
    `) as { id: string }[]
    if (rows.length === 0) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin"
    const blob = await put(
      `event-media/${eventId}/${crypto.randomUUID()}.${ext}`,
      file,
      { access: "private" },
    )

    return NextResponse.json({ pathname: blob.pathname })
  } catch (error) {
    console.error("[v0] Media upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}

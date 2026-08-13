import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That image is too large. Keep it under 8 MB." },
        { status: 400 },
      )
    }

    const ext = file.name.split(".").pop() || "jpg"
    // The connected Blob store is private, so we upload with private access and
    // serve the image through our own public delivery route (email clients need
    // a URL they can fetch without auth). We persist the pathname, not the raw
    // (non-public) blob URL.
    const blob = await put(
      `event-photos/${session.user.id}/${crypto.randomUUID()}.${ext}`,
      file,
      { access: "private" },
    )

    return NextResponse.json({ pathname: blob.pathname })
  } catch (error) {
    console.error("[v0] Event photo upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

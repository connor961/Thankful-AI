import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"

/**
 * Public delivery route for event photos. Email recipients aren't authenticated,
 * so this streams the (privately stored) image without a session check. It only
 * serves blobs under the `event-photos/` prefix so no other private files can be
 * fetched through it. The pathname already contains an unguessable UUID.
 */
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get("pathname")
    if (!pathname || !pathname.startsWith("event-photos/")) {
      return NextResponse.json({ error: "Invalid pathname" }, { status: 400 })
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })

    if (!result) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        // Immutable: each upload has a unique UUID pathname, so it never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("[v0] Event photo delivery error:", error)
    return NextResponse.json({ error: "Failed to serve photo" }, { status: 500 })
  }
}

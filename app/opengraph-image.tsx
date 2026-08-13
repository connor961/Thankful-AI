import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

// Applies to every route as the default OpenGraph image unless a route defines
// its own. The source art is square, so we render it into an exact 1200x630
// (the 1.91:1 ratio social platforms expect) and center-crop the extra height.
export const alt = "Thankful — Say thank you in a way that feels like you"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  const art = await readFile(join(process.cwd(), "public/og-source.png"))
  const src = `data:image/png;base64,${art.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "#f6ede4",
        }}
      >
        {/* 1200x1200 art vertically centered in the 630-tall frame. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          width={1200}
          height={1200}
          style={{ marginTop: -285, objectFit: "cover" }}
          alt=""
        />
      </div>
    ),
    { ...size },
  )
}

"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Printer } from "lucide-react"
import type { EmailDesign } from "@/lib/types"
import { initials } from "@/lib/format"
import { formatNoteForDisplay } from "@/lib/note-format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export const SERIF = "var(--font-fraunces), Georgia, 'Times New Roman', serif"
export const SANS = "var(--font-nunito), Helvetica, Arial, sans-serif"
export const HAND = "var(--font-caveat), 'Segoe Print', 'Bradley Hand', cursive"

export type CardTheme = {
  coverBg: string
  coverInk: string
  coverBar?: string
  eyebrow: string
  eyebrowColor: string
  title: string
  titleFamily: string
  titleItalic?: boolean
  accent: string
  ornament: "flourish" | "bar" | "confetti"
  insideBg: string
  insideInk: string
  insideLabel: string
  labelColor: string
  divider: string
  footer: string
  footerColor: string
}

export const THEMES: Record<EmailDesign, CardTheme> = {
  classic: {
    coverBg: "#fffdf9",
    coverInk: "#3d322c",
    coverBar: "#c05a4d",
    eyebrow: "WITH GRATITUDE",
    eyebrowColor: "#c79a5b",
    title: "Thank you",
    titleFamily: SERIF,
    titleItalic: true,
    accent: "#d9ad6f",
    ornament: "flourish",
    insideBg: "#fffdf9",
    insideInk: "#4a3d36",
    insideLabel: "A note for you",
    labelColor: "#c79a5b",
    divider: "#e4c58f",
    footer: "Sent with love",
    footerColor: "#a89a8d",
  },
  modern: {
    coverBg: "#ffffff",
    coverInk: "#18181b",
    eyebrow: "THANK YOU",
    eyebrowColor: "#71717a",
    title: "Thank you",
    titleFamily: SANS,
    accent: "#18181b",
    ornament: "bar",
    insideBg: "#ffffff",
    insideInk: "#27272a",
    insideLabel: "A NOTE FOR YOU",
    labelColor: "#71717a",
    divider: "#e4e4e7",
    footer: "With care",
    footerColor: "#a1a1aa",
  },
  playful: {
    coverBg: "#ff7a59",
    coverInk: "#ffffff",
    eyebrow: "HOORAY",
    eyebrowColor: "rgba(255,255,255,0.88)",
    title: "Thank you!",
    titleFamily: SANS,
    accent: "#ffd166",
    ornament: "confetti",
    insideBg: "#fff9f5",
    insideInk: "#3f2a22",
    insideLabel: "A note for you",
    labelColor: "#e9622a",
    divider: "#ffd9c7",
    footer: "Made with joy",
    footerColor: "#e9622a",
  },
}

export function Ornament({ theme }: { theme: CardTheme }) {
  if (theme.ornament === "bar") {
    return (
      <div
        style={{
          width: "0.5in",
          height: "3px",
          background: theme.accent,
          margin: "0.16in auto 0",
        }}
      />
    )
  }
  if (theme.ornament === "confetti") {
    const colors = ["#ffd166", "#ffffff", "#ef476f", "#ffffff", "#ffd166"]
    return (
      <div
        style={{
          display: "flex",
          gap: "0.09in",
          justifyContent: "center",
          marginTop: "0.18in",
        }}
      >
        {colors.map((c, i) => (
          <span
            key={i}
            style={{
              width: "0.12in",
              height: "0.12in",
              borderRadius: "50%",
              background: c,
              display: "block",
            }}
          />
        ))}
      </div>
    )
  }
  // flourish
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.12in",
        marginTop: "0.2in",
      }}
    >
      <span style={{ width: "0.6in", height: "1px", background: theme.divider }} />
      <span style={{ color: theme.accent, fontSize: "16px", lineHeight: 1 }}>
        &#10022;
      </span>
      <span style={{ width: "0.6in", height: "1px", background: theme.divider }} />
    </div>
  )
}

/** One quarter of the sheet. Cover panels are rotated so they read upright once folded. */
function Quadrant({
  children,
  rotate,
  background,
}: {
  children: React.ReactNode
  rotate?: boolean
  background: string
}) {
  return (
    <div
      style={{
        width: "4.25in",
        height: "5.5in",
        overflow: "hidden",
        background,
        transform: rotate ? "rotate(180deg)" : undefined,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  )
}

function isHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//.test(url)
}

/**
 * The full US Letter print sheet, laid out as a quarter-fold card:
 *   [ front cover (180°) ] [ back (180°) ]
 *   [ inside-left         ] [ inside message ]
 * Fold top-behind-bottom, then fold the left half forward over the right. The
 * cover lands on the outside front with the spine on the left, so it opens
 * right-to-left like a book, with the handwritten note upright inside.
 */
export function FoldCardSheet({
  note,
  giver,
  design,
  photoUrl,
  eventName,
}: {
  note: string
  giver: string
  design: EmailDesign
  photoUrl?: string
  eventName?: string
}) {
  const theme = THEMES[design]

  const CoverPanel = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0.6in",
        border:
          design === "modern" ? "1px solid #e4e4e7" : undefined,
        margin: design === "modern" ? "0.35in" : undefined,
        borderRadius: design === "playful" ? "0.2in" : undefined,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: "11px",
          letterSpacing: "3px",
          fontWeight: 700,
          color: theme.eyebrowColor,
        }}
      >
        {theme.eyebrow}
      </div>
      <div
        style={{
          fontFamily: theme.titleFamily,
          fontStyle: theme.titleItalic ? "italic" : "normal",
          fontWeight: design === "classic" ? 500 : 700,
          fontSize: design === "playful" ? "40px" : "36px",
          lineHeight: 1.1,
          color: theme.coverInk,
          marginTop: "0.16in",
        }}
      >
        {theme.title}
      </div>
      <Ornament theme={theme} />
    </div>
  )

  const InsideLeftPanel = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.5in",
      }}
    >
      {isHttpUrl(photoUrl) ? (
        <img
          src={photoUrl || "/placeholder.svg"}
          alt=""
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "3.9in",
            borderRadius: design === "modern" ? "6px" : "0.14in",
            boxShadow:
              design === "modern"
                ? "none"
                : "0 6px 18px rgba(0,0,0,0.14)",
            border: design === "modern" ? "1px solid #e4e4e7" : undefined,
          }}
        />
      ) : (
        <>
          <div
            style={{
              fontFamily: theme.titleFamily,
              fontSize: "88px",
              lineHeight: 1,
              color: theme.accent,
              opacity: 0.28,
            }}
          >
            {initials(giver) || "\u2665"}
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: "11px",
              letterSpacing: "2px",
              fontWeight: 700,
              color: theme.labelColor,
              marginTop: "0.24in",
            }}
          >
            {giver ? `FOR ${giver.toUpperCase()}` : ""}
          </div>
        </>
      )}
    </div>
  )

  const MessagePanel = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "0.55in 0.5in",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: "10px",
          letterSpacing: "2px",
          fontWeight: 700,
          color: theme.labelColor,
        }}
      >
        {theme.insideLabel}
      </div>
      <div
        style={{
          height: "1px",
          background: theme.divider,
          margin: "0.12in 0 0.2in",
        }}
      />
      <div
        style={{
          fontFamily: HAND,
          fontSize: "21px",
          lineHeight: 1.45,
          color: theme.insideInk,
          whiteSpace: "pre-line",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {formatNoteForDisplay(note)}
      </div>
    </div>
  )

  const BackPanel = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0.6in",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: theme.titleFamily,
          fontStyle: theme.titleItalic ? "italic" : "normal",
          fontSize: "15px",
          color: theme.footerColor,
        }}
      >
        {theme.footer}
      </div>
      {eventName ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: "9px",
            letterSpacing: "2px",
            fontWeight: 700,
            color: theme.footerColor,
            opacity: 0.7,
            marginTop: "0.1in",
          }}
        >
          {eventName.toUpperCase()}
        </div>
      ) : null}
    </div>
  )

  return (
    <div
      style={{
        width: "8.5in",
        height: "11in",
        background: "#ffffff",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "4.25in 4.25in",
        gridTemplateRows: "5.5in 5.5in",
      }}
    >
      <Quadrant rotate background={theme.coverBg}>
        {CoverPanel}
      </Quadrant>
      <Quadrant rotate background={design === "playful" ? "#ffffff" : theme.insideBg}>
        {BackPanel}
      </Quadrant>
      <Quadrant background={theme.insideBg}>{InsideLeftPanel}</Quadrant>
      <Quadrant background={theme.insideBg}>{MessagePanel}</Quadrant>

      {/* Screen-only fold guides */}
      <div
        className="print-fold-guide"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "5.5in",
          borderTop: "1px dashed rgba(0,0,0,0.28)",
        }}
      />
      <div
        className="print-fold-guide"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "4.25in",
          borderLeft: "1px dashed rgba(0,0,0,0.28)",
        }}
      />
    </div>
  )
}

export function PrintCardDialog({
  note,
  giver,
  design,
  photoUrl,
  eventName,
  disabled,
}: {
  note: string
  giver: string
  design: EmailDesign
  photoUrl?: string
  eventName?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const sheet = (
    <FoldCardSheet
      note={note}
      giver={giver}
      design={design}
      photoUrl={photoUrl}
      eventName={eventName}
    />
  )

  // Preview scaled to fit the dialog (816px = 8.5in at 96dpi).
  const scale = 0.36

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="ghost" disabled={disabled}>
              <Printer data-icon="inline-start" />
              Print card
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print a fold card</DialogTitle>
            <DialogDescription>
              Print on US Letter, fold in half top-to-bottom, then fold the left
              half over the right. Your cover ends up on the front and it opens
              like a book, with the note handwritten inside.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center">
            <div
              aria-hidden
              style={{
                width: 816 * scale,
                height: 1056 * scale,
                overflow: "hidden",
                borderRadius: 8,
                boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: "8.5in",
                  height: "11in",
                }}
              >
                {sheet}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.print()}>
              <Printer data-icon="inline-start" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real print sheet, portaled to <body> and parked off-screen until print. */}
      {mounted && open
        ? createPortal(
            <div id="print-card-root">{sheet}</div>,
            document.body,
          )
        : null}
    </>
  )
}

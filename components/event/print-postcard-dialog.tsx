"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Mail } from "lucide-react"
import type { EmailDesign, LabelAddress } from "@/lib/types"
import { formatNoteForDisplay } from "@/lib/note-format"
import {
  SANS,
  HAND,
  THEMES,
  Ornament,
  type CardTheme,
} from "@/components/event/print-card-dialog"
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

// USPS postcard rate allows up to 6" x 4.25". We center this landscape card on
// a portrait Letter page so the front and back align when printed duplex with
// the common "flip on long edge" setting (both sides stay upright).
const CARD_W = "6in"
const CARD_H = "4.25in"

/** Formats a mailing address into display lines, dropping empties. */
function addressLines(addr: LabelAddress): string[] {
  const cityLine = [
    addr.city,
    [addr.state, addr.postal_code].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ")
  const country =
    addr.country && !/^(us|usa|united states)$/i.test(addr.country.trim())
      ? addr.country
      : ""
  return [addr.line1, addr.line2, cityLine, country].filter(
    (l): l is string => Boolean(l && l.trim()),
  )
}

/** A page wrapper: a full Letter sheet with the postcard centered near the top. */
function PostcardPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="print-postcard-page"
      style={{
        width: "8.5in",
        height: "11in",
        background: "#ffffff",
        display: "flex",
        justifyContent: "center",
        paddingTop: "1.6in",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", width: CARD_W, height: CARD_H }}>
        {/* Corner crop marks to guide cutting. */}
        {(
          [
            { top: 0, left: 0, bt: true, bl: true },
            { top: 0, right: 0, bt: true, br: true },
            { bottom: 0, left: 0, bb: true, bl: true },
            { bottom: 0, right: 0, bb: true, br: true },
          ] as const
        ).map((c, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              top: "top" in c ? (c.top as number) : undefined,
              bottom: "bottom" in c ? (c.bottom as number) : undefined,
              left: "left" in c ? (c.left as number) : undefined,
              right: "right" in c ? (c.right as number) : undefined,
              width: "0.18in",
              height: "0.18in",
              borderTop: "bt" in c && c.bt ? "1px solid #c9c1b6" : undefined,
              borderBottom: "bb" in c && c.bb ? "1px solid #c9c1b6" : undefined,
              borderLeft: "bl" in c && c.bl ? "1px solid #c9c1b6" : undefined,
              borderRight: "br" in c && c.br ? "1px solid #c9c1b6" : undefined,
            }}
          />
        ))}
        <div
          style={{
            width: CARD_W,
            height: CARD_H,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * A complementary eyebrow for the postcard front. The shared card themes reuse
 * "THANK YOU" as the eyebrow for the modern design, which would repeat the
 * "Thank you" title on the postcard. We pick a phrase per design that pairs
 * with the title instead of echoing it, and never let the eyebrow duplicate
 * the title wording.
 */
function frontEyebrow(theme: CardTheme, design: EmailDesign): string {
  const preferred: Record<EmailDesign, string> = {
    classic: "WITH GRATITUDE",
    modern: "A NOTE OF THANKS",
    playful: "HOORAY",
  }
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .trim()
  // If the theme's own eyebrow already differs from the title, keep it;
  // otherwise fall back to the complementary phrase above.
  if (normalize(theme.eyebrow) !== normalize(theme.title)) {
    return theme.eyebrow
  }
  return preferred[design]
}

/** Front of the postcard: the "Thank you" art side, matching the fold card. */
function PostcardFront({ theme, design }: { theme: CardTheme; design: EmailDesign }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.coverBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        boxSizing: "border-box",
        padding: "0.5in",
        border: design === "modern" ? "1px solid #e4e4e7" : undefined,
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
        {frontEyebrow(theme, design)}
      </div>
      <div
        style={{
          fontFamily: theme.titleFamily,
          fontStyle: theme.titleItalic ? "italic" : "normal",
          fontWeight: design === "classic" ? 500 : 700,
          fontSize: design === "playful" ? "44px" : "40px",
          lineHeight: 1.1,
          color: theme.coverInk,
          marginTop: "0.14in",
        }}
      >
        {theme.title}
      </div>
      <Ornament theme={theme} />
    </div>
  )
}

/** Back of the postcard: handwritten message (left) + address block (right). */
function PostcardBack({
  note,
  theme,
  recipient,
  returnAddress,
}: {
  note: string
  theme: CardTheme
  recipient: LabelAddress | null
  returnAddress: LabelAddress | null
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.insideBg,
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      {/* Message half */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0.3in 0.34in",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: HAND,
            fontSize: "18px",
            lineHeight: 1.4,
            color: theme.insideInk,
            whiteSpace: "pre-line",
            overflow: "hidden",
          }}
        >
          {formatNoteForDisplay(note)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", background: theme.divider }} />

      {/* Address half */}
      <div
        style={{
          flex: 1,
          position: "relative",
          padding: "0.3in 0.34in",
          boxSizing: "border-box",
        }}
      >
        {/* Return address, top-left */}
        <div
          style={{
            fontFamily: SANS,
            fontSize: "9px",
            lineHeight: 1.45,
            color: theme.insideInk,
            maxWidth: "2.3in",
          }}
        >
          {returnAddress ? (
            <>
              <div style={{ fontWeight: 700 }}>{returnAddress.name}</div>
              {addressLines(returnAddress).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </>
          ) : null}
        </div>

        {/* Stamp box, top-right */}
        <div
          style={{
            position: "absolute",
            top: "0.3in",
            right: "0.34in",
            width: "0.85in",
            height: "1in",
            border: "1px dashed #c9c1b6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontFamily: SANS,
            fontSize: "7px",
            letterSpacing: "1px",
            lineHeight: 1.5,
            color: "#b7ad9f",
          }}
        >
          PLACE
          <br />
          STAMP
          <br />
          HERE
        </div>

        {/* Recipient address, lower-center of the address half */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "0.5in",
            right: "0.34in",
            transform: "translateY(-30%)",
            fontFamily: SANS,
            fontSize: "13px",
            lineHeight: 1.5,
            color: theme.insideInk,
          }}
        >
          {recipient ? (
            <>
              <div style={{ fontWeight: 700 }}>{recipient.name}</div>
              {addressLines(recipient).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </>
          ) : (
            // No saved address: blank ruled lines to hand-address.
            <div style={{ display: "flex", flexDirection: "column", gap: "0.26in" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ borderBottom: "1px solid #d8cfc2" }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Both pages, in print order: front, then back. */
export function PostcardSheet({
  note,
  design,
  recipient,
  returnAddress,
}: {
  note: string
  design: EmailDesign
  recipient: LabelAddress | null
  returnAddress: LabelAddress | null
}) {
  const theme = THEMES[design]
  return (
    <>
      <PostcardPage>
        <PostcardFront theme={theme} design={design} />
      </PostcardPage>
      <PostcardPage>
        <PostcardBack
          note={note}
          theme={theme}
          recipient={recipient}
          returnAddress={returnAddress}
        />
      </PostcardPage>
    </>
  )
}

export function PrintPostcardDialog({
  note,
  giver,
  design,
  recipient = null,
  returnAddress = null,
  disabled,
}: {
  note: string
  giver: string
  design: EmailDesign
  recipient?: LabelAddress | null
  returnAddress?: LabelAddress | null
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const theme = THEMES[design]

  // Preview scale: the postcard is 6in (576px @ 96dpi) wide.
  const scale = 0.7

  const sheet = (
    <PostcardSheet
      note={note}
      design={design}
      recipient={recipient}
      returnAddress={returnAddress}
    />
  )

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="ghost" disabled={disabled}>
              <Mail data-icon="inline-start" />
              Postcard
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Print a postcard</DialogTitle>
            <DialogDescription>
              Print double-sided on cardstock (flip on the long edge), then cut
              along the corner marks. Mail it with a postcard stamp &mdash; no
              envelope needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3">
            {/* Front + back previews, scaled to fit the dialog. */}
            {[0, 1].map((face) => (
              <div
                key={face}
                aria-hidden
                style={{
                  width: 576 * scale,
                  height: 408 * scale,
                  overflow: "hidden",
                  borderRadius: 8,
                  boxShadow: "0 6px 22px rgba(0,0,0,0.16)",
                }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: CARD_W,
                    height: CARD_H,
                  }}
                >
                  {face === 0 ? (
                    <PostcardFront theme={theme} design={design} />
                  ) : (
                    <PostcardBack
                      note={note}
                      theme={theme}
                      recipient={recipient}
                      returnAddress={returnAddress}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {!recipient ? (
            <p className="text-xs text-muted-foreground text-pretty">
              No saved address for {giver}. We left ruled lines so you can write
              it by hand &mdash; or add their address in Contacts and it will
              print automatically.
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.print()}>
              <Mail data-icon="inline-start" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real print sheet, portaled to <body> and parked off-screen until print. */}
      {mounted && open
        ? createPortal(<div id="print-card-root">{sheet}</div>, document.body)
        : null}
    </>
  )
}

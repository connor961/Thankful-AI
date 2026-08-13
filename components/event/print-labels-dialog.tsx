"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Printer, MapPinOff } from "lucide-react"
import Link from "next/link"
import type { LabelAddress } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const SANS = "var(--font-nunito), Helvetica, Arial, sans-serif"

/**
 * Avery 5160 / 8160 layout (the de-facto US address-label sheet):
 * 30 labels per US Letter page, 3 columns x 10 rows, each 2.625in x 1in,
 * 0.5in top margin, 0.1875in side margins, 0.125in gutter between columns.
 * All measurements are in inches so the printed grid maps 1:1 to the physical
 * sheet (paired with `@page { margin: 0 }` in globals.css).
 */
const COLS = 3
const ROWS = 10
const PER_SHEET = COLS * ROWS

type LabelMode = "recipients" | "return"

/** Builds standard postal lines for a LabelAddress, skipping empty fields. */
function labelLines(a: LabelAddress): string[] {
  const lines = [a.line1, a.line2].map((s) => s.trim()).filter(Boolean)
  const cityState = [a.city.trim(), a.state.trim()].filter(Boolean).join(", ")
  const locality = [cityState, a.postal_code.trim()].filter(Boolean).join(" ")
  if (locality) lines.push(locality)
  if (a.country.trim()) lines.push(a.country.trim())
  return lines
}

function LabelCell({ address }: { address: LabelAddress | null }) {
  return (
    <div
      style={{
        height: "1in",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 0.22in",
        boxSizing: "border-box",
      }}
    >
      {address ? (
        <>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "11px",
              color: "#111111",
              lineHeight: 1.28,
            }}
          >
            {address.name}
          </div>
          {labelLines(address).map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: SANS,
                fontSize: "10.5px",
                color: "#333333",
                lineHeight: 1.28,
              }}
            >
              {line}
            </div>
          ))}
        </>
      ) : null}
    </div>
  )
}

/** One full US Letter sheet of up to 30 labels. */
function AverySheet({ cells }: { cells: (LabelAddress | null)[] }) {
  const padded = [...cells]
  while (padded.length < PER_SHEET) padded.push(null)
  return (
    <div
      className="print-label-sheet"
      style={{
        width: "8.5in",
        height: "11in",
        background: "#ffffff",
        boxSizing: "border-box",
        paddingTop: "0.5in",
        paddingLeft: "0.1875in",
        paddingRight: "0.1875in",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 2.625in)`,
          columnGap: "0.125in",
          gridAutoRows: "1in",
        }}
      >
        {padded.map((address, i) => (
          <LabelCell key={i} address={address} />
        ))}
      </div>
    </div>
  )
}

/** Splits a flat cell list into pages of 30. */
function paginate(cells: (LabelAddress | null)[]): (LabelAddress | null)[][] {
  if (cells.length === 0) return []
  const pages: (LabelAddress | null)[][] = []
  for (let i = 0; i < cells.length; i += PER_SHEET) {
    pages.push(cells.slice(i, i + PER_SHEET))
  }
  return pages
}

export function PrintLabelsDialog({
  open,
  onOpenChange,
  recipients,
  missing,
  returnAddress,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: LabelAddress[]
  missing: string[]
  returnAddress: LabelAddress | null
}) {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<LabelMode>("recipients")
  const [skip, setSkip] = useState(0)

  useEffect(() => setMounted(true), [])

  // Fall back to whichever mode actually has data available.
  useEffect(() => {
    if (recipients.length === 0 && returnAddress) setMode("return")
  }, [recipients.length, returnAddress])

  const clampedSkip = Math.max(0, Math.min(skip, PER_SHEET - 1))

  const cells = useMemo<(LabelAddress | null)[]>(() => {
    const lead: (LabelAddress | null)[] = Array(clampedSkip).fill(null)
    if (mode === "return") {
      if (!returnAddress) return lead
      const copies = Array(PER_SHEET - clampedSkip).fill(returnAddress)
      return [...lead, ...copies]
    }
    return [...lead, ...recipients]
  }, [mode, clampedSkip, recipients, returnAddress])

  const pages = useMemo(() => paginate(cells), [cells])

  const hasData =
    mode === "recipients" ? recipients.length > 0 : Boolean(returnAddress)

  // Preview: first page scaled to fit the dialog (816px = 8.5in @ 96dpi).
  const scale = 0.42

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print address labels</DialogTitle>
            <DialogDescription>
              Formatted for Avery 5160 / 8160 sheets (30 labels per page). Print
              on a label sheet, peel, and stick — no handwriting needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>What to print</Label>
              <ToggleGroup
                variant="outline"
                value={[mode]}
                onValueChange={(v) =>
                  setMode((v[v.length - 1] as LabelMode) ?? mode)
                }
                className="w-full"
              >
                <ToggleGroupItem value="recipients" className="flex-1">
                  Recipients ({recipients.length})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="return"
                  className="flex-1"
                  disabled={!returnAddress}
                >
                  Return address
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label-skip">Skip used labels</Label>
              <Input
                id="label-skip"
                type="number"
                min={0}
                max={PER_SHEET - 1}
                value={clampedSkip}
                onChange={(e) => setSkip(Number(e.target.value) || 0)}
                className="w-28"
              />
              <p className="text-xs text-muted-foreground text-pretty">
                Reusing a partly-used sheet? Skip the labels already peeled off
                so printing starts in the right spot.
              </p>
            </div>

            {mode === "recipients" && missing.length > 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <MapPinOff className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-pretty">
                  {missing.length} recipient
                  {missing.length === 1 ? "" : "s"} skipped (no address saved):{" "}
                  <span className="text-foreground">
                    {missing.slice(0, 6).join(", ")}
                    {missing.length > 6 ? "…" : ""}
                  </span>
                  . Add addresses on the{" "}
                  <Link href="/contacts" className="underline">
                    Contacts
                  </Link>{" "}
                  page.
                </p>
              </div>
            ) : null}

            {mode === "return" && !returnAddress ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground text-pretty">
                You haven&apos;t saved a return address yet. Add one in{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>{" "}
                to print return-address labels.
              </div>
            ) : null}

            {hasData ? (
              <div className="flex flex-col items-center gap-1.5">
                <div
                  aria-hidden
                  className="border border-border"
                  style={{
                    width: 816 * scale,
                    height: 1056 * scale,
                    overflow: "hidden",
                    borderRadius: 6,
                    boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
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
                    {pages[0] ? <AverySheet cells={pages[0]} /> : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pages.length === 1
                    ? "1 page"
                    : `Page 1 of ${pages.length}`}
                </p>
              </div>
            ) : mode === "recipients" ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground text-pretty">
                None of this event&apos;s gift-givers have a saved address yet.
                Add addresses on the{" "}
                <Link href="/contacts" className="underline">
                  Contacts
                </Link>{" "}
                page to print labels for them.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.print()} disabled={!hasData}>
              <Printer data-icon="inline-start" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real print sheets, portaled to <body>; isolated by the print CSS. */}
      {mounted && open && hasData
        ? createPortal(
            <div id="print-card-root">
              {pages.map((cells, i) => (
                <AverySheet key={i} cells={cells} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

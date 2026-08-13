"use client"

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Gift as GiftIcon,
  Plus,
  Trash2,
  Sparkles,
  Upload,
  Download,
} from "lucide-react"
import { addManualGiftsBulk } from "@/app/actions/events"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

type Row = { id: number; gift: string; giver: string; relationship: string }

let ROW_ID = 0
function emptyRow(): Row {
  return { id: ROW_ID++, gift: "", giver: "", relationship: "" }
}
function blankRows(n: number): Row[] {
  return Array.from({ length: n }, emptyRow)
}

/**
 * Parses pasted text into rows. Each non-empty line becomes a gift. Supported
 * shapes (giver first): "Aunt Marie - wool blanket", "Aunt Marie: blanket",
 * "Aunt Marie | blanket", "Aunt Marie, blanket", or a tab-separated pair. The
 * "Gift from Giver" phrasing is detected and swapped automatically.
 */
function parseList(text: string): Row[] {
  const rows: Row[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    // "<gift> from <giver>"
    const fromMatch = line.match(/^(.*\S)\s+from\s+(\S.*)$/i)
    if (fromMatch) {
      rows.push({
        id: ROW_ID++,
        gift: fromMatch[1].trim(),
        giver: fromMatch[2].trim(),
        relationship: "",
      })
      continue
    }

    // Split on every occurrence of the delimiter so an optional third field
    // maps to relationship: "<giver><delim><gift>[<delim><relationship>]".
    const parts = line
      .split(/\s*(?:—|\||\t|:|\s-\s|,)\s*/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      rows.push({
        id: ROW_ID++,
        giver: parts[0],
        gift: parts[1],
        relationship: parts.slice(2).join(", "),
      })
      continue
    }

    // No delimiter — treat the whole line as the gift for the user to finish.
    rows.push({ id: ROW_ID++, gift: line, giver: "", relationship: "" })
  }
  return rows
}

/** Splits one CSV line into fields, honoring double-quoted values (with "" escapes). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      fields.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields.map((f) => f.trim())
}

/**
 * Parses CSV text into rows. If the first line looks like a header, columns are
 * matched by name (gift/item, from/giver/name, relationship, note/comment).
 * Otherwise columns are positional: giver, gift, relationship. Blank lines and
 * rows without both a gift and a giver are dropped by the caller.
 */
function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []

  const first = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const findCol = (...names: string[]) =>
    first.findIndex((h) => names.some((n) => h === n || h.includes(n)))

  const giftCol = findCol("gift", "item", "present")
  const giverCol = findCol("from", "giver", "guest", "name", "sender")
  const relCol = findCol("relationship", "relation")
  const hasHeader = giftCol !== -1 || giverCol !== -1

  const dataLines = hasHeader ? lines.slice(1) : lines
  const gi = giftCol === -1 ? 1 : giftCol
  const gv = giverCol === -1 ? 0 : giverCol
  const rl = relCol

  const rows: Row[] = []
  for (const line of dataLines) {
    const cols = splitCsvLine(line)
    if (cols.every((c) => !c)) continue
    rows.push({
      id: ROW_ID++,
      giver: (cols[gv] ?? "").trim(),
      gift: (cols[gi] ?? "").trim(),
      relationship: rl !== -1 ? (cols[rl] ?? "").trim() : (cols[2] ?? "").trim(),
    })
  }
  return rows
}

export function BulkGiftDialog({
  eventId,
  trigger,
}: {
  eventId: string
  trigger: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState("rows")

  const [rows, setRows] = useState<Row[]>(() => blankRows(3))
  const [pasteText, setPasteText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validCount = useMemo(
    () => rows.filter((r) => r.gift.trim() && r.giver.trim()).length,
    [rows],
  )

  function reset() {
    setRows(blankRows(3))
    setPasteText("")
    setTab("rows")
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((r) => r.id !== id)))
  }

  // Appends parsed rows to any the user already started, then jumps to review.
  function mergeParsedRows(parsed: Row[], noun: string) {
    if (parsed.length === 0) {
      toast.error(`Nothing to import — that ${noun} looks empty.`)
      return
    }
    const existing = rows.filter((r) => r.gift.trim() || r.giver.trim())
    setRows([...existing, ...parsed])
    setTab("rows")
    toast.success(
      `Imported ${parsed.length} ${parsed.length === 1 ? "row" : "rows"} — review and edit below.`,
    )
  }

  function handleParse() {
    mergeParsedRows(parseList(pasteText), "list")
  }

  async function handleCsvFile(file: File | undefined) {
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith(".csv") && file.type && !file.type.includes("csv")) {
      toast.error("Please choose a .csv file.")
      return
    }
    try {
      const text = await file.text()
      mergeParsedRows(parseCsv(text), "file")
    } catch {
      toast.error("Couldn't read that file. Please try again.")
    } finally {
      // Allow re-selecting the same file to re-trigger onChange.
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Builds a sample CSV in-memory and triggers a download so users can see the
  // exact expected columns and quoting.
  function downloadTemplate() {
    const csv = [
      "from,gift,relationship",
      'Aunt Marie,"wool blanket, hand-knit",aunt',
      "Grandpa Joe,savings bond,grandfather",
      '"The Chens",wooden crib,family friends',
    ].join("\n")
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    )
    const a = document.createElement("a")
    a.href = url
    a.download = "thankful-gift-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validCount === 0) {
      toast.error("Add at least one row with both a gift and who it's from.")
      return
    }
    startTransition(async () => {
      try {
        const result = await addManualGiftsBulk(
          eventId,
          rows.map((r) => ({
            gift: r.gift,
            giver: r.giver,
            relationship: r.relationship,
          })),
        )

        if (!result.ok) {
          if (result.code === "limit_reached") {
            setOpen(false)
            toast.error(result.error, {
              duration: 8000,
              action: {
                label: "Upgrade",
                onClick: () => openUpgradeDialog(result.error),
              },
            })
          } else if (result.code === "billing") {
            toast.error(result.error, {
              duration: 12000,
              action: {
                label: "Add card",
                onClick: () =>
                  window.open(
                    "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                    "_blank",
                    "noopener,noreferrer",
                  ),
              },
            })
          } else {
            toast.error(result.error)
          }
          return
        }

        toast.success(
          `Added ${result.added} ${result.added === 1 ? "gift" : "gifts"} and drafted the notes`,
        )
        setOpen(false)
        router.refresh()
      } catch {
        toast.error("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) reset()
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add gifts in bulk</DialogTitle>
            <DialogDescription>
              Enter several gifts at once and we&apos;ll draft a personalized
              thank-you note for each one.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="my-4 gap-4">
            <TabsList>
              <TabsTrigger value="rows">Enter rows</TabsTrigger>
              <TabsTrigger value="paste">Paste a list</TabsTrigger>
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="rows" className="flex flex-col gap-3">
              <div className="hidden grid-cols-[1fr_1fr_140px_auto] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                <span>Gift</span>
                <span>Who it&apos;s from</span>
                <span>Relationship</span>
                <span className="sr-only">Remove</span>
              </div>

              <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto pr-1">
                {rows.map((row, i) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-center"
                  >
                    <Input
                      aria-label={`Gift ${i + 1}`}
                      placeholder="Wool blanket"
                      value={row.gift}
                      onChange={(e) => updateRow(row.id, { gift: e.target.value })}
                      disabled={pending}
                    />
                    <Input
                      aria-label={`Who gift ${i + 1} is from`}
                      placeholder="Aunt Marie"
                      value={row.giver}
                      onChange={(e) => updateRow(row.id, { giver: e.target.value })}
                      disabled={pending}
                    />
                    <Input
                      aria-label={`Relationship for gift ${i + 1}`}
                      placeholder="Aunt"
                      value={row.relationship}
                      onChange={(e) =>
                        updateRow(row.id, { relationship: e.target.value })
                      }
                      disabled={pending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove gift ${i + 1}`}
                      onClick={() => removeRow(row.id)}
                      disabled={pending}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRows((prev) => [...prev, emptyRow()])}
                  disabled={pending}
                >
                  <Plus data-icon="inline-start" />
                  Add row
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="bulk-paste">Paste your list</FieldLabel>
                <Textarea
                  id="bulk-paste"
                  placeholder={"Aunt Marie - wool blanket\nGrandma Rose - silver photo frame\nThe Hendersons - gift card to Nordstrom"}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  disabled={pending}
                  className="font-mono text-sm"
                />
                <FieldDescription>
                  One gift per line as{" "}
                  <span className="font-medium text-foreground">
                    From - Gift - Relationship
                  </span>{" "}
                  (relationship is optional; a comma, colon, or &quot;from&quot;
                  also work). You can review and edit everything before adding.
                </FieldDescription>
              </Field>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleParse}
                  disabled={pending || !pasteText.trim()}
                >
                  <Sparkles data-icon="inline-start" />
                  Parse into rows
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => handleCsvFile(e.target.files?.[0])}
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Choose a CSV file
                </span>
                <span className="text-xs text-muted-foreground">
                  We&apos;ll import the rows so you can review them before adding.
                </span>
              </button>
              <FieldDescription>
                Include a header row with{" "}
                <span className="font-medium text-foreground">from</span>,{" "}
                <span className="font-medium text-foreground">gift</span>, and an
                optional{" "}
                <span className="font-medium text-foreground">relationship</span>{" "}
                column. No header? We&apos;ll read columns as from, gift,
                relationship.
              </FieldDescription>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Download className="size-4" />
                Download CSV template
              </button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="items-center sm:justify-between">
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {validCount > 0
                ? `${validCount} ready to add`
                : "Fill in a gift and who it's from"}
            </span>
            <div className="flex gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={pending || validCount === 0}>
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <GiftIcon data-icon="inline-start" />
                )}
                {pending
                  ? "Drafting notes..."
                  : `Add ${validCount || ""} ${validCount === 1 ? "gift" : "gifts"} & draft notes`.replace(
                      "  ",
                      " ",
                    )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

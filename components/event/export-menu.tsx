"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ClipboardCopy,
  FileText,
  Sheet,
  Printer,
  Tag,
  Share,
  ChevronDown,
  Lock,
} from "lucide-react"
import type { EventRow, GiftWithNote, LabelAddress } from "@/lib/types"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
import {
  downloadFile,
  notesToCsv,
  notesToText,
  printNotes,
  shareableItems,
  slugify,
} from "@/lib/export"
import { PrintLabelsDialog } from "@/components/event/print-labels-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ExportMenu({
  event,
  items,
  contactAddresses = {},
  returnAddress = null,
  canPrint,
}: {
  event: EventRow
  items: GiftWithNote[]
  contactAddresses?: Record<string, LabelAddress>
  returnAddress?: LabelAddress | null
  /** Whether printing & mailing is unlocked (paid plan or Event Pass). */
  canPrint: boolean
}) {
  const count = shareableItems(items).length
  const slug = slugify(event.name)

  const [labelsOpen, setLabelsOpen] = useState(false)

  // Build the label recipient list from this event's unique gift-givers,
  // matching each against the address book. Givers without a saved address are
  // surfaced separately so the user knows who was skipped.
  const { recipients, missing } = useMemo(() => {
    const seen = new Set<string>()
    const recipients: LabelAddress[] = []
    const missing: string[] = []
    for (const item of items) {
      const giver = item.giver.trim()
      if (!giver) continue
      const key = giver.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const address = contactAddresses[key]
      if (address) recipients.push(address)
      else missing.push(giver)
    }
    return { recipients, missing }
  }, [items, contactAddresses])

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(notesToText(event, items))
      toast.success(`Copied ${count} note${count === 1 ? "" : "s"} to clipboard`)
    } catch {
      toast.error("Couldn't access the clipboard")
    }
  }

  function handleDownloadText() {
    downloadFile(`${slug}-thank-you-notes.txt`, notesToText(event, items), "text/plain")
    toast.success("Downloaded as text file")
  }

  function handleDownloadCsv() {
    downloadFile(`${slug}-thank-you-notes.csv`, notesToCsv(items), "text/csv")
    toast.success("Downloaded as CSV")
  }

  function handlePrint() {
    printNotes(event, items)
  }

  const triggerDisabled = count === 0 && recipients.length === 0

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" disabled={triggerDisabled}>
              <Share data-icon="inline-start" />
              Export
              <ChevronDown data-icon="inline-end" />
            </Button>
          }
        />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {count} note{count === 1 ? "" : "s"} ready to share
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyAll}>
            <ClipboardCopy data-icon="inline-start" />
            Copy all notes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer data-icon="inline-start" />
            Print / Save as PDF
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Download</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleDownloadText}>
            <FileText data-icon="inline-start" />
            Text file (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadCsv}>
            <Sheet data-icon="inline-start" />
            Spreadsheet (.csv)
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mail</DropdownMenuLabel>
          {canPrint ? (
            <DropdownMenuItem onClick={() => setLabelsOpen(true)}>
              <Tag data-icon="inline-start" />
              Print address labels
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                openUpgradeDialog(
                  "Printing address labels is available on any paid plan or with an Event Pass.",
                )
              }
            >
              <Tag data-icon="inline-start" />
              Print address labels
              <Lock data-icon="inline-end" className="ml-auto text-muted-foreground" />
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <PrintLabelsDialog
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        recipients={recipients}
        missing={missing}
        returnAddress={returnAddress}
      />
    </>
  )
}

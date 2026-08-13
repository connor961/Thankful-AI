import type { EventRow, GiftWithNote } from "@/lib/types"

/** Notes that are ready to be shared (approved or sent, with content). */
export function shareableItems(items: GiftWithNote[]): GiftWithNote[] {
  return items.filter((i) => i.note && i.note.content.trim().length > 0)
}

/** A single note rendered as plain text with a light header. */
export function noteToText(item: GiftWithNote): string {
  const header = item.relationship
    ? `${item.giver} (${item.relationship}) — ${item.gift}`
    : `${item.giver} — ${item.gift}`
  return `To: ${header}\n\n${item.note?.content ?? ""}`
}

/** All notes joined into one plain-text document. */
export function notesToText(event: EventRow, items: GiftWithNote[]): string {
  const shareable = shareableItems(items)
  const parts = shareable.map(noteToText)
  return `Thank-you notes — ${event.name}\n\n${parts.join("\n\n———\n\n")}\n`
}

function csvCell(value: string): string {
  const v = value ?? ""
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

/** All notes rendered as a CSV string. */
export function notesToCsv(items: GiftWithNote[]): string {
  const rows = [
    ["Giver", "Relationship", "Gift", "Tone", "Status", "Note"],
    ...shareableItems(items).map((i) => [
      i.giver,
      i.relationship,
      i.gift,
      i.note?.tone ?? "",
      i.note?.status ?? "",
      i.note?.content ?? "",
    ]),
  ]
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
}

/** Trigger a client-side file download for a text payload. */
export function downloadFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** A URL-safe slug for filenames. */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event"
  )
}

/** A mailto: link that pre-fills the subject and note body. */
export function mailtoForNote(item: GiftWithNote): string {
  const subject = `Thank you, ${item.giver}!`
  const body = item.note?.content ?? ""
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body,
  )}`
}

/** Open a print-friendly window containing all shareable notes. */
export function printNotes(event: EventRow, items: GiftWithNote[]): void {
  const shareable = shareableItems(items)
  const win = window.open("", "_blank", "width=800,height=900")
  if (!win) return

  const cards = shareable
    .map((i) => {
      const meta = i.relationship
        ? `${escapeHtml(i.giver)} · ${escapeHtml(i.relationship)}`
        : escapeHtml(i.giver)
      return `
        <article class="note">
          <div class="meta">
            <span class="giver">${meta}</span>
            <span class="gift">${escapeHtml(i.gift)}</span>
          </div>
          <p class="body">${escapeHtml(i.note?.content ?? "").replace(/\n/g, "<br />")}</p>
        </article>`
    })
    .join("")

  win.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Thank-you notes — ${escapeHtml(event.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #1c1917;
      margin: 0;
      padding: 48px;
      line-height: 1.6;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 4px;
    }
    .subtitle {
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 13px;
      color: #78716c;
      margin: 0 0 32px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .note {
      page-break-inside: avoid;
      padding: 24px 0;
      border-top: 1px solid #e7e5e4;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      font-family: -apple-system, system-ui, sans-serif;
      margin-bottom: 12px;
    }
    .giver { font-weight: 600; font-size: 15px; }
    .gift { color: #78716c; font-size: 13px; }
    .body { margin: 0; font-size: 15px; white-space: normal; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(event.name)}</h1>
  <p class="subtitle">Thank-you notes · ${shareable.length} recipient${
    shareable.length === 1 ? "" : "s"
  }</p>
  ${cards}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`)
  win.document.close()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

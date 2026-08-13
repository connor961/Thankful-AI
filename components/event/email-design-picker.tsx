"use client"

import { Check } from "lucide-react"
import {
  EMAIL_DESIGN_DESCRIPTIONS,
  EMAIL_DESIGN_LABELS,
  type EmailDesign,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const DESIGNS = Object.keys(EMAIL_DESIGN_LABELS) as EmailDesign[]

/**
 * A miniature, non-interactive mock of each email design so the choice is made
 * visually. These use representative literal colors on purpose — they depict a
 * standalone email artifact, not app chrome, so they intentionally sit outside
 * the app's theme tokens.
 */
function DesignThumbnail({ design }: { design: EmailDesign }) {
  const line = (w: string, color: string) => (
    <div
      className="h-1 rounded-full"
      style={{ width: w, backgroundColor: color }}
    />
  )

  if (design === "classic") {
    return (
      <div
        className="flex h-full flex-col overflow-hidden rounded-md"
        style={{ backgroundColor: "#f4efe7" }}
        aria-hidden="true"
      >
        <div style={{ height: 4, backgroundColor: "#c05a4d" }} />
        <div className="flex flex-1 flex-col items-center gap-1.5 px-3 py-2.5">
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "#3d322c",
            }}
          >
            Thank you
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 14, height: 1, backgroundColor: "#e4c58f" }} />
            <div style={{ color: "#d9ad6f", fontSize: 8, lineHeight: 1 }}>
              &#10022;
            </div>
            <div style={{ width: 14, height: 1, backgroundColor: "#e4c58f" }} />
          </div>
          <div className="mt-1 flex w-full flex-col items-center gap-1">
            {line("80%", "#c9bcae")}
            {line("70%", "#c9bcae")}
            {line("60%", "#c9bcae")}
          </div>
        </div>
      </div>
    )
  }

  if (design === "modern") {
    return (
      <div
        className="flex h-full flex-col overflow-hidden rounded-md border"
        style={{ backgroundColor: "#ffffff", borderColor: "#e4e4e7" }}
        aria-hidden="true"
      >
        <div className="flex flex-1 flex-col gap-1.5 px-3 py-3">
          <div
            style={{
              fontSize: 7,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#71717a",
              fontWeight: 700,
            }}
          >
            Thank You
          </div>
          <div style={{ width: 18, height: 2, backgroundColor: "#18181b" }} />
          <div className="mt-1 flex w-full flex-col gap-1">
            {line("90%", "#d4d4d8")}
            {line("75%", "#d4d4d8")}
            {line("82%", "#d4d4d8")}
            {line("55%", "#d4d4d8")}
          </div>
        </div>
      </div>
    )
  }

  // playful
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-md"
      style={{ backgroundColor: "#ffffff" }}
      aria-hidden="true"
    >
      <div
        className="flex flex-col items-center justify-center gap-1 px-3 py-2"
        style={{ backgroundColor: "#ff7a59" }}
      >
        <div
          style={{
            fontFamily: "'Trebuchet MS', Verdana, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          Thank you!
        </div>
        <div className="flex items-center gap-1">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: "#ffd166",
            }}
          />
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
            }}
          />
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: "#ef476f",
            }}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        {line("85%", "#e7cfc4")}
        {line("70%", "#e7cfc4")}
        {line("78%", "#e7cfc4")}
      </div>
    </div>
  )
}

export function EmailDesignPicker({
  value,
  onChange,
  disabled,
}: {
  value: EmailDesign
  onChange: (design: EmailDesign) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Email design"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {DESIGNS.map((design) => {
        const selected = value === design
        return (
          <button
            key={design}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(design)}
            className={cn(
              "group relative flex flex-col gap-2 rounded-xl border p-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary ring-2 ring-primary/40"
                : "border-border hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {selected ? (
              <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
            <div className="h-24 w-full">
              <DesignThumbnail design={design} />
            </div>
            <div className="flex flex-col gap-0.5 px-1 pb-1">
              <span className="text-sm font-medium text-foreground">
                {EMAIL_DESIGN_LABELS[design]}
              </span>
              <span className="text-xs leading-snug text-muted-foreground text-pretty">
                {EMAIL_DESIGN_DESCRIPTIONS[design]}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

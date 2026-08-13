"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImagePlus, Trash2, RefreshCw } from "lucide-react"
import { updateEventPhoto } from "@/app/actions/events"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/** Builds the public delivery URL for a stored photo pathname. */
export function eventPhotoSrc(pathname: string): string {
  if (!pathname) return ""
  return `/api/event-photo/view?pathname=${encodeURIComponent(pathname)}`
}

export function EventPhoto({
  eventId,
  photoUrl,
}: {
  eventId: string
  photoUrl: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, startSaving] = useTransition()
  const busy = uploading || saving

  function pickFile() {
    inputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so choosing the same file again still fires onChange.
    e.target.value = ""
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/event-photo", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Upload failed. Please try again.")
        return
      }
      startSaving(async () => {
        await updateEventPhoto(eventId, data.pathname)
        toast.success("Event photo saved. It'll appear on emailed cards.")
        router.refresh()
      })
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    startSaving(async () => {
      await updateEventPhoto(eventId, "")
      toast.success("Event photo removed")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />

      {photoUrl ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={eventPhotoSrc(photoUrl) || "/placeholder.svg"}
              alt="Event card photo"
              className="h-28 w-full object-cover sm:w-48"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground text-pretty">
              This photo appears as a banner on every emailed thank-you card.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={pickFile}
                disabled={busy}
              >
                {busy ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={busy}
              >
                <Trash2 data-icon="inline-start" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {busy ? <Spinner /> : <ImagePlus className="size-5" />}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium">Add an event photo</span>
            <span className="text-xs text-muted-foreground text-pretty">
              Make each emailed note feel like a personalized card.
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

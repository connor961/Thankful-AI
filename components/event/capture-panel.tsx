"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  FileText,
  Video,
  Mic,
  Radio,
  Sparkles,
  Wand2,
  Lock,
} from "lucide-react"
import { processTranscript, transcribeMedia } from "@/app/actions/events"
import { openUpgradeDialog } from "@/components/billing/upgrade-dialog"
import { SAMPLE_TRANSCRIPTS } from "@/lib/samples"
import { canUploadMedia, type PlanId } from "@/lib/plans"
import type { EventType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Hard cap that mirrors the upload route + transcription model limit. */
const MAX_BYTES = 25 * 1024 * 1024

/** Container types the transcription model + AI SDK can read. */
const VIDEO_ACCEPT = "video/mp4,video/webm"
const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/m4a,audio/x-m4a,audio/webm"

const PROCESSING_STEPS = [
  "Reading the transcript",
  "Identifying speakers and gifts",
  "Matching givers and reactions",
  "Writing personalized notes",
]

export function CapturePanel({
  eventId,
  eventType,
  planId,
  compact = false,
}: {
  eventId: string
  eventType: EventType
  planId?: PlanId
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [transcript, setTranscript] = useState("")
  const [step, setStep] = useState(0)
  const [media, setMedia] = useState<null | "uploading" | "transcribing">(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const canUseMedia = canUploadMedia(planId)

  const suggested =
    SAMPLE_TRANSCRIPTS.find((s) => s.eventType === eventType) ??
    SAMPLE_TRANSCRIPTS[0]
  const otherSamples = SAMPLE_TRANSCRIPTS.filter((s) => s.id !== suggested.id)

  function pickMedia(kind: "video" | "audio") {
    if (!canUseMedia) {
      openUpgradeDialog(
        "Upload a video or audio recording and we'll transcribe it automatically — available on the Family and Pro plans.",
      )
      return
    }
    ;(kind === "video" ? videoInputRef : audioInputRef).current?.click()
  }

  async function handleMediaFile(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "video" | "audio",
  ) {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again re-triggers change.
    e.target.value = ""
    if (!file) return

    if (file.size > MAX_BYTES) {
      toast.error("That file is over the 25 MB limit. Try a shorter clip.")
      return
    }

    const allowed = (kind === "video" ? VIDEO_ACCEPT : AUDIO_ACCEPT).split(",")
    if (file.type && !allowed.includes(file.type)) {
      toast.error(
        kind === "video"
          ? "Please choose an MP4 or WebM video."
          : "Please choose an MP3, WAV, M4A, OGG, or WebM audio file.",
      )
      return
    }

    setMedia("uploading")
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("eventId", eventId)

      const res = await fetch("/api/media-upload", {
        method: "POST",
        body: form,
      })
      const data = (await res.json()) as { pathname?: string; error?: string }
      if (!res.ok || !data.pathname) {
        toast.error(data.error || "Upload failed. Please try again.")
        return
      }

      setMedia("transcribing")
      const result = await transcribeMedia(eventId, data.pathname)

      if (!result.ok) {
        if (result.code === "not_entitled") {
          openUpgradeDialog(result.error)
        } else {
          toast.error(result.error)
        }
        return
      }

      setTranscript((prev) =>
        prev.trim() ? `${prev.trim()}\n\n${result.transcript}` : result.transcript,
      )
      toast.success("Transcribed! Review the text below, then generate notes.")
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Upload failed. Please try again.",
      )
    } finally {
      setMedia(null)
    }
  }

  function handleProcess() {
    if (transcript.trim().length < 20) {
      toast.error("Paste a transcript (or load a sample) to get started")
      return
    }
    setStep(0)
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, PROCESSING_STEPS.length - 1))
    }, 1400)
    startTransition(async () => {
      try {
        const result = await processTranscript(eventId, transcript.trim())
        clearInterval(timer)

        if (!result.ok) {
          if (result.code === "limit_reached") {
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

        if (result.giftsFound === 0) {
          toast.error("We couldn't find any gifts in that transcript")
          return
        }
        toast.success(
          `Found ${result.giftsFound} ${result.giftsFound === 1 ? "gift" : "gifts"} and drafted your notes`,
        )
        setTranscript("")
        router.refresh()
      } catch {
        clearInterval(timer)
        toast.error("Processing failed. Please try again.")
      }
    })
  }

  if (media) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Spinner className="size-7 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-serif text-xl font-semibold">
            {media === "uploading" ? "Uploading your recording" : "Transcribing"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {media === "uploading"
              ? "Sending the file securely — hang tight."
              : "Turning speech into text. This can take a moment for longer clips."}
          </p>
        </div>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Wand2 className="size-7 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-serif text-xl font-semibold">
            Working some magic
          </h3>
          <p className="text-sm text-muted-foreground">
            This usually takes under a minute.
          </p>
        </div>
        <ul className="flex w-full max-w-xs flex-col gap-2 text-left">
          {PROCESSING_STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-colors",
                i < step && "text-muted-foreground",
                i === step && "font-medium text-foreground",
                i > step && "text-muted-foreground/50",
              )}
            >
              {i === step ? (
                <Spinner className="size-4 text-primary" />
              ) : (
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border text-[10px]",
                    i < step
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {i < step ? "✓" : ""}
                </span>
              )}
              {label}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={videoInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(e) => handleMediaFile(e, "video")}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={(e) => handleMediaFile(e, "audio")}
      />

      {!compact ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Transcript — always available */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.04] p-3 text-center">
            <FileText className="size-5 text-primary" />
            <span className="text-xs font-medium">Import transcript</span>
          </div>

          {/* Video + audio — Family/Pro; otherwise a locked tile that upsells */}
          <MediaTile
            icon={Video}
            label="Upload video"
            entitled={canUseMedia}
            onClick={() => pickMedia("video")}
          />
          <MediaTile
            icon={Mic}
            label="Upload audio"
            entitled={canUseMedia}
            onClick={() => pickMedia("audio")}
          />

          {/* Live recording — still upcoming */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-xl border border-dashed p-3 text-center opacity-60">
                  <Radio className="size-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Live recording
                  </span>
                </div>
              }
            />
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      {!compact && canUseMedia ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          Upload an MP4/WebM video or an audio file (up to 25 MB) and we&apos;ll
          transcribe it into the box below for you to review.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={compact ? 6 : 10}
          placeholder="Paste your event transcript here. Include who said what, which gifts were opened, and reactions..."
          className="resize-none leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Try a sample:</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTranscript(suggested.transcript)}
          >
            <Sparkles data-icon="inline-start" />
            {suggested.label} example
          </Button>
          {otherSamples.map((s) => (
            <Button
              key={s.id}
              variant="ghost"
              size="sm"
              onClick={() => setTranscript(s.transcript)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {transcript ? (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {transcript.trim().split(/\s+/).length} words
          </Badge>
        ) : (
          <span />
        )}
        <Button size="lg" onClick={handleProcess}>
          <Wand2 data-icon="inline-start" />
          Generate thank-you notes
        </Button>
      </div>
    </div>
  )
}

function MediaTile({
  icon: Icon,
  label,
  entitled,
  onClick,
}: {
  icon: typeof Video
  label: string
  entitled: boolean
  onClick: () => void
}) {
  const tile = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
        entitled
          ? "hover:border-primary/50 hover:bg-primary/[0.04]"
          : "border-dashed opacity-70 hover:opacity-100",
      )}
    >
      {!entitled ? (
        <Lock className="absolute right-2 top-2 size-3 text-muted-foreground" />
      ) : null}
      <Icon
        className={cn("size-5", entitled ? "text-primary" : "text-muted-foreground")}
      />
      <span
        className={cn(
          "text-xs font-medium",
          entitled ? "" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  )

  if (entitled) return tile

  return (
    <Tooltip>
      <TooltipTrigger render={tile} />
      <TooltipContent>Family &amp; Pro — tap to upgrade</TooltipContent>
    </Tooltip>
  )
}

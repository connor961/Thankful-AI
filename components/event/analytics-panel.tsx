import { Gift, CheckCircle2, Send, Target } from "lucide-react"
import type { GiftWithNote } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function AnalyticsPanel({ items }: { items: GiftWithNote[] }) {
  const total = items.length
  const sent = items.filter((i) => i.note?.status === "sent").length
  const approved = items.filter((i) => i.note?.status === "approved").length
  const pending = items.filter(
    (i) => i.note?.status === "draft" || !i.note,
  ).length
  const ready = sent + approved
  const avgConfidence =
    total > 0
      ? Math.round(
          items.reduce(
            (sum, i) => sum + Math.min(i.giver_confidence, i.gift_confidence),
            0,
          ) / total,
        )
      : 0
  const completion = total > 0 ? Math.round((ready / total) * 100) : 0

  const breakdown = [
    { label: "Sent", value: sent, className: "bg-primary" },
    { label: "Approved", value: approved, className: "bg-chart-4" },
    { label: "Pending review", value: pending, className: "bg-accent" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Gift} label="Gifts tracked" value={`${total}`} />
        <Stat icon={CheckCircle2} label="Notes ready" value={`${ready}`} />
        <Stat icon={Send} label="Notes sent" value={`${sent}`} />
        <Stat
          icon={Target}
          label="Avg. match accuracy"
          value={`${avgConfidence}%`}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold">
              Completion
            </h3>
            <span className="text-sm text-muted-foreground">
              {ready} of {total} ready to send
            </span>
          </div>
          <Progress value={completion} />
          <div className="flex flex-col gap-3 pt-1">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className={`size-3 shrink-0 rounded-full ${b.className}`} />
                <span className="flex-1 text-sm">{b.label}</span>
                <span className="text-sm font-medium tabular-nums">
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <Icon className="size-5 text-primary" />
        <div className="flex flex-col">
          <span className="font-serif text-2xl font-semibold leading-none">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

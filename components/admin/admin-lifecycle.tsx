import { Send, UserX, Undo2 } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import type { LifecycleFunnel } from "@/lib/admin-data"

/** Day-1/3/7 sequence labels, keyed by step for the "emails sent" breakdown. */
const STEP_LABELS: Record<number, string> = {
  1: "Day 1 nudge",
  3: "Day 3 reminder",
  7: "Day 7 final",
}

export function AdminLifecycle({ funnel }: { funnel: LifecycleFunnel }) {
  const maxAge = Math.max(1, ...funnel.notActivatedByAge.map((b) => b.count))
  const totalNotActivated = funnel.notActivatedByAge.reduce(
    (sum, b) => sum + b.count,
    0,
  )

  return (
    <Card className="p-0">
      <CardHeader className="border-b p-5">
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-primary" />
          Activation emails
        </CardTitle>
        <CardDescription>
          Users who signed up but haven&apos;t sent a note yet
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-5">
        <div>
          <div className="font-serif text-3xl text-foreground tabular-nums">
            {totalNotActivated}
          </div>
          <div className="text-xs text-muted-foreground">
            not activated, by account age
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {funnel.notActivatedByAge.map((b) => (
            <div key={b.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{b.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {b.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(b.count / maxAge) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Emails sent
          </div>
          {funnel.sentByStep.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {funnel.sentByStep.map((s) => (
                <span
                  key={s.step}
                  className="rounded-lg bg-muted/60 px-2.5 py-1 text-sm text-foreground"
                >
                  {STEP_LABELS[s.step] ?? `Step ${s.step}`}:{" "}
                  <span className="font-medium tabular-nums">{s.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              None sent yet — the sequence is in dry-run until enabled.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <Undo2 className="size-4 text-primary" />
            <span className="text-foreground tabular-nums">
              {funnel.recoveredUsers}
            </span>
            <span className="text-muted-foreground">recovered</span>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <UserX className="size-4 text-muted-foreground" />
            <span className="text-foreground tabular-nums">
              {funnel.optOuts}
            </span>
            <span className="text-muted-foreground">opted out</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

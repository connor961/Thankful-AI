import {
  Users,
  UserPlus,
  Sparkles,
  CalendarDays,
  Mail,
  Send,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import type { AdminOverview } from "@/lib/admin-data"

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <Card className="gap-2 p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-4">
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-1 font-serif text-3xl text-foreground tabular-nums">
        {value}
      </div>
      {sublabel ? (
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      ) : null}
    </Card>
  )
}

const nf = new Intl.NumberFormat("en-US")

export function AdminOverviewCards({ overview }: { overview: AdminOverview }) {
  const activationPct = `${Math.round(overview.activationRate * 100)}%`

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <StatCard
        icon={<Users />}
        label="Total users"
        value={nf.format(overview.totalUsers)}
        sublabel={`+${nf.format(overview.newUsers30d)} in 30 days`}
      />
      <StatCard
        icon={<UserPlus />}
        label="New (7d)"
        value={nf.format(overview.newUsers7d)}
        sublabel="signups this week"
      />
      <StatCard
        icon={<Sparkles />}
        label="Activated"
        value={activationPct}
        sublabel={`${nf.format(overview.activatedUsers)} sent a note`}
      />
      <StatCard
        icon={<CalendarDays />}
        label="Events"
        value={nf.format(overview.totalEvents)}
        sublabel="excludes samples"
      />
      <StatCard
        icon={<Mail />}
        label="Notes drafted"
        value={nf.format(overview.totalNotes)}
        sublabel="all-time"
      />
      <StatCard
        icon={<Send />}
        label="Notes sent"
        value={nf.format(overview.notesSent)}
        sublabel={`+${nf.format(overview.notesSent7d)} this week`}
      />
    </div>
  )
}

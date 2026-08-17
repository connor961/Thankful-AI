import { DollarSign, Ticket } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import type { AdminRevenue as AdminRevenueData } from "@/lib/admin-data"

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function AdminRevenue({ revenue }: { revenue: AdminRevenueData }) {
  const maxMrr = Math.max(1, ...revenue.plans.map((p) => p.mrrCents))

  return (
    <Card className="p-0">
      <CardHeader className="border-b p-5">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="size-4 text-primary" />
          Revenue
        </CardTitle>
        <CardDescription>Estimated from current subscriptions</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="font-serif text-3xl text-foreground tabular-nums">
              {money(revenue.mrrCents)}
            </div>
            <div className="text-xs text-muted-foreground">
              Monthly recurring revenue
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl text-foreground tabular-nums">
              {revenue.payingCustomers}
            </div>
            <div className="text-xs text-muted-foreground">Paying customers</div>
          </div>
        </div>

        {revenue.plans.length > 0 ? (
          <div className="flex flex-col gap-3">
            {revenue.plans.map((p) => (
              <div key={p.plan} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {p.count} &middot; {money(p.mrrCents)}/mo
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(p.mrrCents / maxMrr) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active paid subscriptions yet.
          </p>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Ticket className="size-4 text-primary" />
          <span className="text-foreground">
            {revenue.activePasses} active Event{" "}
            {revenue.activePasses === 1 ? "Pass" : "Passes"}
          </span>
          <span className="ml-auto text-muted-foreground tabular-nums">
            {money(revenue.passRevenueCents)} lifetime
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

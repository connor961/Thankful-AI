"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  Search,
  MoreVertical,
  Shield,
  ShieldOff,
  Ticket,
  Sparkles,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setAdminRole, compEventPass } from "@/app/actions/admin"
import type { AdminUserRow } from "@/lib/admin-data"
import type { PlanId } from "@/lib/plans"

const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  family: "Family",
  pro: "Pro",
}

function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function AdminUsersTable({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: AdminUserRow[]
  currentAdminId: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialUsers
    return initialUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q),
    )
  }, [query, initialUsers])

  function runAction(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center gap-3 border-b p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {filtered.length} of {initialUsers.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium text-right">Notes</th>
              <th className="px-4 py-3 font-medium text-right">Events</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === currentAdminId
              const isUserAdmin = u.role === "admin"
              return (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex flex-col rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        {u.name || "—"}
                        {isUserAdmin ? (
                          <Badge className="gap-1 bg-primary/10 text-primary">
                            <Shield className="size-3" />
                            Admin
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {joinedLabel(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={u.plan === "free" ? "outline" : "default"}>
                        {PLAN_LABELS[u.plan]}
                      </Badge>
                      {u.hasActivePass ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Ticket className="size-3" />
                          Pass
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u.notesSent}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u.eventsCount}
                  </td>
                  <td className="px-4 py-3">
                    {u.activated ? (
                      <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="size-3" />
                        Activated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {u.optedOut ? "Opted out" : "Not activated"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${u.email}`}
                            disabled={pending}
                          >
                            <MoreVertical />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-52">
                        {isUserAdmin ? (
                          <DropdownMenuItem
                            disabled={isSelf || pending}
                            onClick={() =>
                              runAction(
                                () => setAdminRole(u.id, false),
                                `Removed admin from ${u.email}`,
                              )
                            }
                          >
                            <ShieldOff data-icon="inline-start" />
                            Remove admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            disabled={pending}
                            onClick={() =>
                              runAction(
                                () => setAdminRole(u.id, true),
                                `Made ${u.email} an admin`,
                              )
                            }
                          >
                            <Shield data-icon="inline-start" />
                            Make admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={u.hasActivePass || pending}
                          onClick={() =>
                            runAction(
                              () => compEventPass(u.id),
                              `Granted an Event Pass to ${u.email}`,
                            )
                          }
                        >
                          <Ticket data-icon="inline-start" />
                          {u.hasActivePass ? "Has a pass" : "Comp Event Pass"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No users match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

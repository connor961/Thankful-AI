"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  MailX,
  Shield,
  ShieldOff,
  Ticket,
  CalendarDays,
  Send,
  CheckCircle2,
  CircleDot,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  setAdminRole,
  compEventPass,
  setEmailOptOut,
} from "@/app/actions/admin"
import type { AdminUserDetail } from "@/lib/admin-data"

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  baby_shower: "Baby shower",
  birthday: "Birthday",
  graduation: "Graduation",
  holiday: "Holiday",
  other: "Other",
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AdminUserDetail({
  user,
  currentAdminId,
}: {
  user: AdminUserDetail
  currentAdminId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<string | null>(null)

  const isAdmin = user.role === "admin"
  const isSelf = user.id === currentAdminId

  function toggleRole() {
    // Guard the one irreversible-from-here action: an admin removing their own
    // access would immediately lose the ability to undo it.
    if (isAdmin && isSelf) {
      const confirmed = window.confirm(
        "Remove your own admin access? You'll lose access to the admin area immediately and can't restore it here.",
      )
      if (!confirmed) return
    }
    run(
      "role",
      () => setAdminRole(user.id, !isAdmin),
      isAdmin ? "Removed admin access." : "Granted admin access.",
    )
  }

  function run(name: string, fn: () => Promise<{ ok: true }>, success: string) {
    setAction(name)
    startTransition(async () => {
      try {
        await fn()
        toast.success(success)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong.",
        )
      } finally {
        setAction(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/admin" />}
          className="mb-3 -ml-2"
        >
          <ArrowLeft data-icon="inline-start" />
          Back to admin
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-3xl">
                {user.name || "Unnamed user"}
              </h1>
              {isAdmin ? (
                <Badge className="gap-1 bg-primary/10 text-primary">
                  <Shield className="size-3" />
                  Admin
                </Badge>
              ) : null}
              {user.optedOut ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <MailX className="size-3" />
                  Opted out
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">
              Joined {formatDate(user.createdAt)} ·{" "}
              {user.emailVerified ? "Email verified" : "Email unverified"} ·{" "}
              <span className="font-mono text-xs">{user.id}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(
                  "optout",
                  () => setEmailOptOut(user.id, !user.optedOut),
                  user.optedOut
                    ? "User opted back in to emails."
                    : "User opted out of emails.",
                )
              }
            >
              {user.optedOut ? (
                <Mail data-icon="inline-start" />
              ) : (
                <MailX data-icon="inline-start" />
              )}
              {action === "optout" && isPending
                ? "Saving…"
                : user.optedOut
                  ? "Opt back in"
                  : "Opt out of email"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(
                  "pass",
                  () => compEventPass(user.id),
                  "Comped an Event Pass.",
                )
              }
            >
              <Ticket data-icon="inline-start" />
              {action === "pass" && isPending ? "Comping…" : "Comp Event Pass"}
            </Button>
            <Button
              variant={isAdmin ? "outline" : "default"}
              size="sm"
              disabled={isPending}
              onClick={toggleRole}
            >
              {isAdmin ? (
                <ShieldOff data-icon="inline-start" />
              ) : (
                <Shield data-icon="inline-start" />
              )}
              {action === "role" && isPending
                ? "Saving…"
                : isAdmin
                  ? "Remove admin"
                  : "Make admin"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Plan"
          value={user.usage.planName}
          hint={
            user.subscription
              ? user.subscription.status
              : user.usage.canPrint
                ? "Print enabled"
                : "Free tier"
          }
        />
        <Stat
          label="Free notes used"
          value={
            user.usage.unlimited
              ? "Unlimited"
              : `${user.usage.used} / ${user.usage.limit}`
          }
          hint={user.usage.lifetime ? "Lifetime (no reset)" : "This period"}
        />
        <Stat
          label="Notes sent"
          value={String(user.notesSentTotal)}
          hint={user.activated ? "Activated" : "Not activated"}
        />
        <Stat
          label="Events"
          value={String(user.events.length)}
          hint={`${user.events.filter((e) => e.isSample).length} sample`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Subscription and Event Passes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {user.subscription ? (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {user.subscription.planName}
                  </span>
                  <Badge
                    variant={
                      user.subscription.status === "active"
                        ? "default"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {user.subscription.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.subscription.cancelAtPeriodEnd
                    ? "Cancels at period end · "
                    : "Renews "}
                  {formatDate(user.subscription.currentPeriodEnd)}
                </p>
                {user.subscription.stripeCustomerId ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {user.subscription.stripeCustomerId}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No paid subscription.
              </p>
            )}

            {user.passes.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Event Passes</p>
                {user.passes.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Ticket className="size-4 text-muted-foreground" />
                      {p.sendsUsed} / {p.sendsTotal} sends used
                      {p.isComp ? (
                        <Badge variant="outline" className="text-xs">
                          Comped
                        </Badge>
                      ) : null}
                    </span>
                    <span className="capitalize text-muted-foreground">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Note sends and activation emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {user.activity.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    {item.type === "note_sent" ? (
                      <Send className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(item.at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            {user.events.length} total ·{" "}
            {user.events.filter((e) => !e.isSample).length} real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This user hasn&apos;t created any events.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {user.events.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{e.name}</span>
                      <Badge variant="secondary" className="capitalize">
                        {EVENT_TYPE_LABELS[e.eventType] ?? e.eventType}
                      </Badge>
                      {e.isSample ? (
                        <Badge className="bg-primary/10 text-primary">
                          Sample
                        </Badge>
                      ) : null}
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      Created {formatDate(e.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {e.notesSent === e.notesTotal && e.notesTotal > 0 ? (
                      <CheckCircle2 className="size-4 text-primary" />
                    ) : (
                      <CircleDot className="size-4 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">
                      {e.notesSent} / {e.notesTotal} sent
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-serif text-2xl">{value}</span>
        {hint ? (
          <span className="text-xs capitalize text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}

"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CreditCard, Settings, LogOut, LayoutDashboard } from "lucide-react"

import { signOut } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type SessionUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

function toInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function UserMenu({
  user,
  isAdmin = false,
}: {
  user: SessionUser
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
      router.push("/sign-in")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Account menu"
          >
            <Avatar size="sm">
              {user.image ? (
                <AvatarImage src={user.image} alt="" />
              ) : null}
              <AvatarFallback>{toInitials(user.name, user.email)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate font-medium text-foreground">
              {user.name || "Your account"}
            </span>
            {user.email ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={<Link href="/admin" />}
                nativeButton={false}
              >
                <LayoutDashboard data-icon="inline-start" />
                Admin
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href="/settings" />}
            nativeButton={false}
          >
            <Settings data-icon="inline-start" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/billing" />}
            nativeButton={false}
          >
            <CreditCard data-icon="inline-start" />
            Billing &amp; plans
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} disabled={pending}>
            <LogOut data-icon="inline-start" />
            {pending ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

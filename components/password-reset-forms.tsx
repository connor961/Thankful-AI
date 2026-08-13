"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight, MailCheck } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { BrandMark } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

/**
 * Step 1: request a reset link. We always show the same success message whether
 * or not the email matches an account, so the form can't be used to discover
 * which addresses are registered.
 */
export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Please enter your email")
      return
    }

    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      })
      if (error) {
        toast.error(error.message ?? "Something went wrong. Please try again.")
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <MailCheck className="size-6 text-primary" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground text-balance">
              Check your inbox
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {
                "If an account exists for that email, we've sent a link to reset your password. It expires in one hour."
              }
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-2 w-full"
            nativeButton={false}
            render={<Link href="/sign-in" />}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-11" />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground text-balance">
            Forgot your password?
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Enter your email and we&apos;ll send you a link to reset it.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
            {!pending ? <ArrowRight data-icon="inline-end" /> : null}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

/**
 * Step 2: choose a new password. The token arrives in the URL after Better Auth
 * verifies the emailed link. If it's missing or invalid, we steer the user back
 * to request a fresh one instead of showing a dead form.
 */
export function ResetPasswordForm({
  token,
  invalid,
}: {
  token?: string
  invalid?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const linkBroken = invalid || !token

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords don't match")
      return
    }

    startTransition(async () => {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (error) {
        toast.error(
          error.message ??
            "That reset link is invalid or expired. Please request a new one.",
        )
        return
      }
      toast.success("Password updated. You can sign in now.")
      router.push("/sign-in")
    })
  }

  if (linkBroken) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark className="size-11" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground text-balance">
              This link has expired
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Your reset link is invalid or has expired. Request a new one and
              we&apos;ll email you a fresh link.
            </p>
          </div>
          <Button
            className="mt-2 w-full"
            nativeButton={false}
            render={<Link href="/forgot-password" />}
          >
            Request a new link
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-11" />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground text-balance">
            Choose a new password
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Pick something at least 8 characters long.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Updating..." : "Update password"}
            {!pending ? <ArrowRight data-icon="inline-end" /> : null}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

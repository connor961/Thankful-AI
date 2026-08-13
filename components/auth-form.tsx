"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"

import { signIn, signUp } from "@/lib/auth-client"
import { claimOrphanEventsIfFirstUser } from "@/app/actions/auth"
import { BrandMark } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

type Mode = "sign-in" | "sign-up"

const COPY: Record<
  Mode,
  { title: string; subtitle: string; cta: string; alt: string; altHref: string; altLabel: string }
> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off with your thank-you notes.",
    cta: "Sign in",
    alt: "New to Thankful AI?",
    altHref: "/sign-up",
    altLabel: "Create an account",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Start turning gift transcripts into heartfelt thank-you notes.",
    cta: "Create account",
    alt: "Already have an account?",
    altHref: "/sign-in",
    altLabel: "Sign in",
  },
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const copy = COPY[mode]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password")
      return
    }
    if (mode === "sign-up" && !name.trim()) {
      toast.error("Please enter your name")
      return
    }
    if (mode === "sign-up" && password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    startTransition(async () => {
      const { error } =
        mode === "sign-up"
          ? await signUp.email({ email: email.trim(), password, name: name.trim() })
          : await signIn.email({ email: email.trim(), password })

      if (error) {
        toast.error(error.message ?? "Something went wrong. Please try again.")
        return
      }

      if (mode === "sign-up") {
        try {
          await claimOrphanEventsIfFirstUser()
        } catch {
          // Non-fatal: the account is created either way.
        }
      }

      router.push("/")
      router.refresh()
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-11" />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground text-balance">
            {copy.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <FieldGroup>
          {mode === "sign-up" ? (
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Kennedi Carter"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={mode === "sign-in"}
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              {mode === "sign-in" ? (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Please wait..." : copy.cta}
            {!pending ? <ArrowRight data-icon="inline-end" /> : null}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {copy.alt}{" "}
        <Link
          href={copy.altHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {copy.altLabel}
        </Link>
      </p>
    </div>
  )
}

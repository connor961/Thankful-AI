import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Thankful account.",
  robots: { index: false, follow: true },
}

export default async function SignInPage() {
  const session = await getSession()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <AuthForm mode="sign-in" />
    </main>
  )
}

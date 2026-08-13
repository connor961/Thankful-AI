import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export const metadata = {
  title: "Get started",
  description: "Create a free Thankful account and start thanking people your way.",
  robots: { index: false, follow: true },
}

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <AuthForm mode="sign-up" />
    </main>
  )
}

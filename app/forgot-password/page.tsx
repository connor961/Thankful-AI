import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { ForgotPasswordForm } from "@/components/password-reset-forms"

export const metadata = {
  title: "Reset your password | Thankful AI",
  description: "Request a link to reset your Thankful AI password.",
}

export default async function ForgotPasswordPage() {
  const session = await getSession()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <ForgotPasswordForm />
    </main>
  )
}

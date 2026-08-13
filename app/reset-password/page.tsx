import { ResetPasswordForm } from "@/components/password-reset-forms"

export const metadata = {
  title: "Choose a new password | Thankful AI",
  description: "Set a new password for your Thankful AI account.",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  // Better Auth verifies the emailed link and redirects here with either a
  // `token` (valid) or an `error` (expired/invalid) query param.
  const { token, error } = await searchParams

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <ResetPasswordForm token={token} invalid={Boolean(error)} />
    </main>
  )
}

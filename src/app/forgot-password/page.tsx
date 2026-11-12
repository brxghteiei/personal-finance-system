import { AuthPanel } from '@/components/auth/auth-panel'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  return <AuthPanel mode="forgot" email={email} />
}

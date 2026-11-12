import { AuthPanel } from '@/components/auth/auth-panel'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string; verified?: string }> }) {
  const { token, email, verified } = await searchParams
  return <AuthPanel mode="verify" token={verified === '1' ? 'verified' : token} email={email} />
}
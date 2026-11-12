import { AuthPanel } from '@/components/auth/auth-panel'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; authError?: string }> }) {
  const { next, authError } = await searchParams
  return <AuthPanel mode="login" nextPath={next} callbackError={authError === '1'} />
}
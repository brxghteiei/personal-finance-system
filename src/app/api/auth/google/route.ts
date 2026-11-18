import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { appUrl, isProduction } from '@/lib/auth/config'
import { readJson, sameOriginFailure } from '@/lib/auth/security'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const originError = sameOriginFailure(request)
  if (originError) return originError

  const body = await readJson(request)
  if (!body || typeof body !== 'object' || !('acceptTerms' in body) || body.acceptTerms !== true) {
    return NextResponse.json({ error: 'กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว' }, { status: 400 })
  }

  const next = 'next' in body && typeof body.next === 'string' ? body.next : '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/'
  const callback = new URL('/auth/callback', appUrl())
  callback.searchParams.set('flow', 'google')
  callback.searchParams.set('next', safeNext)

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    })
    if (error || !data.url) {
      console.error('Google sign-in start failed', { code: error?.code })
      return NextResponse.json({ error: 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่' }, { status: 503 })
    }

    const jar = await cookies()
    jar.set('ledgerly_google_terms', '2026-11-01', {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
      path: '/auth/callback',
      maxAge: 10 * 60,
    })
    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error('Google sign-in setup failed', { errorName: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่' }, { status: 503 })
  }
}

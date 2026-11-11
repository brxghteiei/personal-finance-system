import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyTurnstile } from '@/lib/auth/captcha'
import { loginSchema } from '@/lib/auth/validation'
import { clearLoginFailures, loginRateLimitKeys, loginThrottleState, recordLoginFailure } from '@/lib/auth/rate-limit'
import { readJson, requestIp, sameOriginFailure } from '@/lib/auth/security'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isProduction } from '@/lib/auth/config'

export async function POST(request: Request) {
  const originError = sameOriginFailure(request)
  if (originError) return originError
  const parsed = loginSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' }, { status: 400 })
  }

  const { identifier, password, rememberMe, captchaToken } = parsed.data
  const ip = requestIp(request)
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { name: { equals: identifier, mode: 'insensitive' } },
      ],
    },
    take: 2,
    select: { id: true, email: true, name: true, authUserId: true },
  })
  const user = candidates.length === 1 ? candidates[0] : null
  const email = user?.email ?? (identifier.includes('@') ? identifier.toLowerCase() : '')
  const rateKeys = loginRateLimitKeys(user?.email ?? identifier.toLowerCase(), ip)
  const throttle = await loginThrottleState(rateKeys)
  if (throttle.blockedUntil > Date.now()) {
    const retry = Math.ceil((throttle.blockedUntil - Date.now()) / 1000)
    return NextResponse.json(
      { error: `ลองใหม่อีกครั้งในอีก ${Math.max(1, Math.ceil(retry / 60))} นาที`, captchaRequired: true, retryAfterSeconds: retry },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    )
  }
  if (throttle.captchaRequired && !(await verifyTurnstile(captchaToken, ip))) {
    const configured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
    return NextResponse.json(
      { error: configured ? 'โปรดยืนยัน CAPTCHA เพื่อดำเนินการต่อ' : 'ระบบยืนยัน CAPTCHA ยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ', captchaRequired: true },
      { status: configured ? 400 : 503 },
    )
  }

  let supabase
  try {
    supabase = await createSupabaseServerClient({ rememberMe })
  } catch (error) {
    console.error('Supabase login setup failed', { errorName: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'ระบบเข้าสู่ระบบยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 })
  }
  const { data, error } = email
    ? await supabase.auth.signInWithPassword({ email, password })
    : { data: { user: null }, error: new Error('Invalid login credentials') }

  if (error || !data.user) {
    await recordLoginFailure(rateKeys)
    const state = await loginThrottleState(rateKeys)
    if (error && 'code' in error && error.code === 'email_not_confirmed') {
      return NextResponse.json({ error: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', verificationRequired: true }, { status: 403 })
    }
    if (state.blockedUntil > Date.now()) {
      const retry = Math.ceil((state.blockedUntil - Date.now()) / 1000)
      return NextResponse.json(
        { error: `ลองใหม่อีกครั้งในอีก ${Math.max(1, Math.ceil(retry / 60))} นาที`, captchaRequired: true, retryAfterSeconds: retry },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      )
    }
    return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
  }

  if (user && !user.authUserId) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.json({ error: 'บัญชีนี้ยังย้ายเข้าสู่ระบบใหม่ไม่เสร็จ กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 })
  }
  const profile = await prisma.user.findUnique({
    where: { authUserId: data.user.id },
    select: { id: true, email: true, name: true },
  })
  if (!profile) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.json({ error: 'ไม่พบบัญชีโปรไฟล์ กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 })
  }
  const jar = await cookies()
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60
  jar.set('ledgerly_remember', String(rememberMe), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
  await clearLoginFailures(rateKeys)
  return NextResponse.json({ user: profile })
}
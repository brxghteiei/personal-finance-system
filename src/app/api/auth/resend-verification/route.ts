import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resendVerificationSchema } from '@/lib/auth/validation'
import { RESEND_COOLDOWN_MS } from '@/lib/auth/config'
import { enforceActionRateLimit } from '@/lib/auth/rate-limit'
import { readJson, requestIp, sameOriginFailure } from '@/lib/auth/security'
import { appUrl } from '@/lib/auth/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const originError = sameOriginFailure(request)
  if (originError) return originError
  const parsed = resendVerificationSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'กรุณากรอกอีเมลให้ถูกต้อง' }, { status: 400 })
  }
  const { identifier } = parsed.data
  const candidates = await prisma.user.findMany({
    where: { OR: [ { email: identifier.toLowerCase() }, { name: { equals: identifier, mode: 'insensitive' } } ] },
    take: 2,
    select: { id: true, email: true, authUserId: true, emailVerifiedAt: true },
  })
  const user = candidates.length === 1 ? candidates[0] : null
  const retryAfter = await enforceActionRateLimit(
    'verify-resend',
    [`email:${user?.email ?? identifier.toLowerCase()}`, `ip:${requestIp(request)}`],
    1,
    RESEND_COOLDOWN_MS,
  )
  if (retryAfter) {
    return NextResponse.json(
      { error: `ส่งอีกครั้งได้ใน ${retryAfter} วินาที`, retryAfterSeconds: retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }
  if (user?.authUserId && !user.emailVerifiedAt) {
    try {
      const supabase = await createSupabaseServerClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: new URL('/auth/callback?next=%2Fverify-email', appUrl()).toString() },
      })
      if (error) console.error('Supabase verification resend failed', { code: error.code })
    } catch (error) {
      console.error('Supabase verification resend setup failed', { errorName: error instanceof Error ? error.name : 'UnknownError' })
    }
  }
  return NextResponse.json({ message: 'ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ' })
}
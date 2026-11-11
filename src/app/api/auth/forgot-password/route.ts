import { NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/lib/auth/validation'
import { appUrl } from '@/lib/auth/config'
import { enforceActionRateLimit } from '@/lib/auth/rate-limit'
import { readJson, requestIp, sameOriginFailure } from '@/lib/auth/security'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const GENERIC_MESSAGE = 'หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตให้แล้ว'

export async function POST(request: Request) {
  const originError = sameOriginFailure(request)
  if (originError) return originError
  const parsed = forgotPasswordSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'กรุณากรอกอีเมลให้ถูกต้อง' }, { status: 400 })
  }
  const { email } = parsed.data
  const cooldown = await enforceActionRateLimit('reset-cooldown', [`email:${email}`, `ip:${requestIp(request)}`], 1, 60 * 1000)
  const hourlyLimit = await enforceActionRateLimit('reset-hourly', [`email:${email}`, `ip:${requestIp(request)}`], 3, 60 * 60_000)
  if (cooldown || hourlyLimit) return NextResponse.json({ message: GENERIC_MESSAGE })

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('/auth/callback?next=%2Freset-password', appUrl()).toString(),
    })
    if (error) console.error('Supabase password recovery request failed', { code: error.code })
  } catch (error) {
    console.error('Supabase password recovery setup failed', { errorName: error instanceof Error ? error.name : 'UnknownError' })
  }
  return NextResponse.json({ message: GENERIC_MESSAGE })
}
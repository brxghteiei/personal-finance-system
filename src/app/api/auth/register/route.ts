import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/auth/validation'
import { sendDuplicateRegistrationNotice } from '@/lib/auth/email'
import { PasswordBreachCheckUnavailableError, validatePasswordSafety } from '@/lib/auth/password-policy'
import { enforceActionRateLimit } from '@/lib/auth/rate-limit'
import { readJson, requestIp, sameOriginFailure } from '@/lib/auth/security'
import { appUrl } from '@/lib/auth/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const GENERIC_MESSAGE = 'ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ'
const confirmationUrl = () => new URL('/auth/callback?next=%2Fverify-email', appUrl()).toString()

export async function POST(request: Request) {
  const originError = sameOriginFailure(request)
  if (originError) return originError
  const parsed = registerSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลสมัครสมาชิกไม่ถูกต้อง' }, { status: 400 })
  }
  const { email, name, password } = parsed.data
  const limited = await enforceActionRateLimit('register-ip', [requestIp(request)], 10, 60 * 60_000)
  if (limited) return NextResponse.json({ error: 'ลองใหม่อีกครั้งภายหลัง' }, { status: 429, headers: { 'Retry-After': String(limited) } })

  try {
    const passwordSafety = await validatePasswordSafety(password)
    if (passwordSafety === 'common') {
      return NextResponse.json({ error: 'รหัสผ่านนี้คาดเดาได้ง่ายเกินไป กรุณาเลือกรหัสผ่านที่ไม่ซ้ำใคร' }, { status: 400 })
    }
    if (passwordSafety === 'breached') {
      return NextResponse.json({ error: 'รหัสผ่านนี้เคยปรากฏในการรั่วไหล กรุณาเลือกรหัสผ่านอื่น' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof PasswordBreachCheckUnavailableError) {
      return NextResponse.json({ error: 'ไม่สามารถตรวจสอบความปลอดภัยของรหัสผ่านได้ชั่วคราว กรุณาลองใหม่' }, { status: 503 })
    }
    throw error
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const noticeLimit = await enforceActionRateLimit('register-notice', [`${email}:${requestIp(request)}`], 3, 60 * 60_000)
    if (!noticeLimit && existing.authUserId && !existing.emailVerifiedAt) {
      const supabase = await createSupabaseServerClient()
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: confirmationUrl() } })
      if (error) console.error('Supabase verification resend failed', { code: error.code })
    } else if (!noticeLimit && existing.emailVerifiedAt) {
      try {
        await sendDuplicateRegistrationNotice(existing.email, existing.name)
      } catch (error) {
        console.error('Duplicate registration notice delivery failed', { errorName: error instanceof Error ? error.name : 'UnknownError' })
      }
    }
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 })
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, termsVersion: '2026-11-01' },
        emailRedirectTo: confirmationUrl(),
      },
    })
    if (error) {
      if (error.code === 'user_already_exists' || error.code === 'email_exists') {
        return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 })
      }
      console.error('Supabase registration failed', { code: error.code })
      return NextResponse.json({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่ภายหลัง' }, { status: 503 })
    }
    const authUser = data.user
    if (!authUser || authUser.identities?.length === 0) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 })
    }
    await prisma.user.create({
      data: {
        authUserId: authUser.id,
        email,
        name,
        passwordHash: null,
        emailVerifiedAt: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
        termsAcceptedAt: new Date(),
        termsVersion: '2026-11-01',
      },
    })
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 })
  } catch (error) {
    console.error('Supabase registration setup failed', { errorName: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่ภายหลัง' }, { status: 503 })
  }
}
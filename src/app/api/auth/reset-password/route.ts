import { NextResponse } from 'next/server'
import { resetPasswordSchema } from '@/lib/auth/validation'
import { sendPasswordChangedEmail } from '@/lib/auth/email'
import { PasswordBreachCheckUnavailableError, validatePasswordSafety } from '@/lib/auth/password-policy'
import { requireApiUser } from '@/lib/auth/api'
import { readJson } from '@/lib/auth/security'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const auth = await requireApiUser(request, true)
  if (!auth.user) return auth.response
  const parsed = resetPasswordSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลตั้งรหัสผ่านไม่ถูกต้อง' }, { status: 400 })
  }
  const { password } = parsed.data
  const normalizedPassword = password.normalize('NFKC').toLocaleLowerCase()
  const emailName = auth.user.email.split('@')[0] ?? ''
  if (
    normalizedPassword === auth.user.email.toLocaleLowerCase() ||
    normalizedPassword === auth.user.name.toLocaleLowerCase() ||
    (emailName.length >= 4 && normalizedPassword.includes(emailName))
  ) {
    return NextResponse.json({ error: 'อย่าใช้ชื่อหรืออีเมลเป็นส่วนหนึ่งของรหัสผ่าน' }, { status: 400 })
  }
  let passwordSafety: Awaited<ReturnType<typeof validatePasswordSafety>>
  try {
    passwordSafety = await validatePasswordSafety(password)
  } catch (error) {
    if (error instanceof PasswordBreachCheckUnavailableError) {
      return NextResponse.json({ error: 'ไม่สามารถตรวจสอบความปลอดภัยของรหัสผ่านได้ชั่วคราว กรุณาลองใหม่' }, { status: 503 })
    }
    throw error
  }
  if (passwordSafety === 'common') {
    return NextResponse.json({ error: 'รหัสผ่านนี้คาดเดาได้ง่ายเกินไป กรุณาเลือกรหัสผ่านที่ไม่ซ้ำใคร' }, { status: 400 })
  }
  if (passwordSafety === 'breached') {
    return NextResponse.json({ error: 'รหัสผ่านนี้เคยปรากฏในการรั่วไหล กรุณาเลือกรหัสผ่านอื่น' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return NextResponse.json({ error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์รีเซ็ตใหม่' }, { status: 400 })
  }
  await supabase.auth.signOut({ scope: 'others' })
  try {
    await sendPasswordChangedEmail(auth.user.email, auth.user.name)
  } catch {
    return NextResponse.json(
      { error: 'เปลี่ยนรหัสผ่านแล้ว แต่ส่งอีเมลแจ้งเตือนไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ', passwordChanged: true },
      { status: 503 },
    )
  }
  return NextResponse.json({ success: true })
}
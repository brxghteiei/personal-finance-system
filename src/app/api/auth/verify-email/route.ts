import { NextResponse } from 'next/server'

// Email confirmation is handled by Supabase Auth now. Do not mark the finance
// profile verified from a legacy token, since that would leave Auth unverified.
export async function POST() {
  return NextResponse.json(
    { error: 'ลิงก์ยืนยันแบบเก่าหมดอายุแล้ว กรุณาขอลิงก์ยืนยันใหม่จากหน้าเข้าสู่ระบบ' },
    { status: 410 },
  )
}

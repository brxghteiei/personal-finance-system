import 'server-only'

import { createHash, createHmac, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { appUrl, authSecret } from './config'

export function createOpaqueToken() {
  return randomBytes(32).toString('hex')
}

export function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function hashRateLimitKey(scope: string, value: string) {
  return createHmac('sha256', authSecret()).update(`${scope}:${value}`).digest('hex')
}

export function requestIp(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

export function sameOriginFailure(request: Request) {
  const expected = appUrl().origin
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  let actual: string | null = null
  try {
    if (origin) actual = new URL(origin).origin
    else if (referer) actual = new URL(referer).origin
  } catch {
    actual = null
  }

  if (actual !== expected) {
    return NextResponse.json({ error: 'คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าแล้วลองใหม่' }, { status: 403 })
  }
  return null
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function genericServerError() {
  return NextResponse.json({ error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง' }, { status: 503 })
}

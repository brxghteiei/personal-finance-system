import { NextResponse } from 'next/server'
import { destroyCurrentSession } from '@/lib/auth/session'
import { sameOriginFailure } from '@/lib/auth/security'

export async function POST(request: Request) {
  const originError = sameOriginFailure(request)
  if (originError) return originError
  await destroyCurrentSession()
  return NextResponse.json({ success: true })
}

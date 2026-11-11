import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function destination(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('next') ?? '/'
  const safe = requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\') ? requested : '/'
  if (safe === '/verify-email') return '/verify-email?verified=1'
  if (safe === '/reset-password') return '/reset-password?token=ready'
  return safe
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const requestedType = request.nextUrl.searchParams.get('type')
  let verifiedType: string | null = null
  let error: Error | null = null

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (tokenHash && (requestedType === 'signup' || requestedType === 'recovery' || requestedType === 'email' || requestedType === 'email_change')) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: requestedType as EmailOtpType })
    error = result.error
    verifiedType = requestedType
  } else {
    error = new Error('Missing Supabase auth callback parameters')
  }

  if (error) {
    console.error('Supabase auth callback failed', { code: 'code' in error ? error.code : undefined })
    return NextResponse.redirect(new URL('/login?authError=1', request.url))
  }

  const { data } = await supabase.auth.getUser()
  if (data.user?.email_confirmed_at) {
    await prisma.user.updateMany({
      where: { authUserId: data.user.id },
      data: { emailVerifiedAt: new Date(data.user.email_confirmed_at) },
    })
  }
  const target = verifiedType === 'recovery' || request.nextUrl.searchParams.get('next') === '/reset-password'
    ? '/reset-password?token=ready'
    : destination(request)
  return NextResponse.redirect(new URL(target, request.url))
}
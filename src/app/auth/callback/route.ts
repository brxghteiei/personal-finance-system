import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Prisma } from '@prisma/client'
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
  const googleFlow = request.nextUrl.searchParams.get('flow') === 'google'
  const jar = await cookies()
  const acceptedTerms = jar.get('ledgerly_google_terms')?.value === '2026-11-01'
  if (googleFlow) jar.set('ledgerly_google_terms', '', { path: '/auth/callback', maxAge: 0 })
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
    return NextResponse.redirect(new URL(googleFlow ? '/login?authError=google' : '/login?authError=1', request.url))
  }

  const { data, error: userError } = await supabase.auth.getUser()
  if (googleFlow) {
    const user = data.user
    if (userError || !user?.email || !user.email_confirmed_at || !user.app_metadata.providers?.includes('google') || !acceptedTerms) {
      console.error('Google sign-in callback validation failed', { code: userError?.code })
      await supabase.auth.signOut({ scope: 'local' })
      return NextResponse.redirect(new URL('/login?authError=google', request.url))
    }

    try {
      const profile = await prisma.user.findUnique({ where: { authUserId: user.id }, select: { id: true } })
      if (!profile) {
        const name = typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim().slice(0, 100)
          : user.email.split('@')[0].slice(0, 100)
        try {
          await prisma.user.create({
            data: {
              authUserId: user.id,
              email: user.email.toLowerCase(),
              name,
              emailVerifiedAt: new Date(user.email_confirmed_at),
              termsAcceptedAt: new Date(),
              termsVersion: '2026-11-01',
            },
          })
        } catch (createError) {
          if (!(createError instanceof Prisma.PrismaClientKnownRequestError) || createError.code !== 'P2002') throw createError
          const existing = await prisma.user.findUnique({ where: { authUserId: user.id }, select: { id: true } })
          if (!existing) {
            await supabase.auth.signOut({ scope: 'local' })
            return NextResponse.redirect(new URL('/login?authError=profile', request.url))
          }
        }
      }
    } catch (profileError) {
      console.error('Google profile setup failed', { errorName: profileError instanceof Error ? profileError.name : 'UnknownError' })
      await supabase.auth.signOut({ scope: 'local' })
      return NextResponse.redirect(new URL('/login?authError=google', request.url))
    }
  }
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
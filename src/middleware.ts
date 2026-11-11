import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

function addSecurityHeaders(response: NextResponse) {
  const scriptSources = ["'self'", "'unsafe-inline'", 'https://challenges.cloudflare.com']
  if (process.env.NODE_ENV === 'development') scriptSources.push("'unsafe-eval'")
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      `script-src ${scriptSources.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' https://challenges.cloudflare.com https://api.pwnedpasswords.com ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`,
      "frame-src https://challenges.cloudflare.com",
      'upgrade-insecure-requests',
    ].join('; '),
  )
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  return response
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  let response = NextResponse.next({ request: { headers: requestHeaders } })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase URL and publishable key are required')

  const rememberMe = request.cookies.get('ledgerly_remember')?.value === 'true'
  const supabase = createServerClient(url, key, {
    cookieOptions: { maxAge: rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60 },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        requestHeaders.set('Cookie', request.cookies.toString())
        response = NextResponse.next({ request: { headers: requestHeaders } })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  await supabase.auth.getClaims()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)'],
}
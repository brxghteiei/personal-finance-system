import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase URL and publishable key are required')
  return { url, key }
}

export async function createSupabaseServerClient(options: { rememberMe?: boolean } = {}) {
  const { url, key } = supabaseConfig()
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookieOptions: { maxAge: options.rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60 },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => cookieStore.set(name, value, cookieOptions))
        } catch {
          // Server Components cannot write cookies; middleware refreshes them first.
        }
      },
    },
  })
}
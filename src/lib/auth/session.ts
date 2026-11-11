import 'server-only'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AuthUser = {
  id: string
  email: string
  name: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const authUserId = data?.claims?.sub
  if (error || typeof authUserId !== 'string') return null

  const user = await prisma.user.findUnique({
    where: { authUserId },
    select: { id: true, email: true, name: true },
  })
  if (!user) return null
  return user
}

export async function requireCurrentUser() {
  return getCurrentUser()
}

export async function destroyCurrentSession() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut({ scope: 'local' })
  const jar = await cookies()
  jar.delete('ledgerly_remember')
}
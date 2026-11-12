import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js'

loadEnv({ path: '.env' })

delete process.env.DATABASE_URL

loadEnv({ path: '.env.supabase', override: true })
const prisma = new PrismaClient()

const databaseUrl = () => process.env['DATABASE_URL'] as string | undefined
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey || !databaseUrl()?.includes('supabase')) {
  throw new Error('Supabase Auth credentials and a Supabase DATABASE_URL are required')
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listAllAuthUsers() {
  const users: SupabaseAuthUser[] = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
}

async function main() {
  const profiles = await prisma.user.findMany({
    where: { authUserId: null },
    select: { id: true, email: true, name: true, passwordHash: true, emailVerifiedAt: true, termsVersion: true },
  })
  const authUsers = await listAllAuthUsers()
  let migrated = 0
  for (const profile of profiles) {
    if (!profile.passwordHash) throw new Error('A legacy profile has no password hash; stop and review before continuing')
    const tagged = authUsers.find((user) => user.user_metadata?.legacyProfileId === profile.id)
    const sameEmail = authUsers.find((user) => user.email?.toLowerCase() === profile.email.toLowerCase())
    if (sameEmail && !tagged) {
      throw new Error('An Auth account already uses an email belonging to a legacy profile; resolve the account link before continuing')
    }

    let authUser = tagged
    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: profile.email,
        password_hash: profile.passwordHash,
        email_confirm: Boolean(profile.emailVerifiedAt),
        user_metadata: {
          name: profile.name,
          legacyProfileId: profile.id,
          termsVersion: profile.termsVersion,
        },
      })
      if (error || !data.user) throw error ?? new Error('Supabase did not return the migrated user')
      authUser = data.user
    }

    await prisma.user.update({
      where: { id: profile.id },
      data: {
        authUserId: authUser.id,
        passwordHash: null,
        emailVerifiedAt: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
      },
    })
    migrated += 1
  }
  console.log(`Linked ${migrated} legacy profiles to Supabase Auth.`)
}

main()
  .catch((error) => {
    console.error('Supabase Auth migration stopped:', error instanceof Error ? error.message : 'Unknown error')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
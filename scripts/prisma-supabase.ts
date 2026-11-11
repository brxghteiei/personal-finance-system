import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'

const databaseUrl = () => process.env['DATABASE_URL'] as string | undefined
loadEnv({ path: '.env' })

delete process.env.DATABASE_URL

loadEnv({ path: '.env.supabase', override: true })
if (!databaseUrl()?.includes('supabase')) {
  throw new Error('.env.supabase must point to the intended Supabase PostgreSQL database')
}

const args = process.argv.slice(2)
if (!args.length) throw new Error('Pass a Prisma command, for example: migrate status')
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', ...args], {
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
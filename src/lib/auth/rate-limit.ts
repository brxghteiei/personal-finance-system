import 'server-only'

import { prisma } from '@/lib/prisma'
import { hashRateLimitKey } from './security'

type Key = { scope: string; keyHash: string }

function keys(values: Array<{ scope: string; value: string }>): Key[] {
  return values.map(({ scope, value }) => ({ scope, keyHash: hashRateLimitKey(scope, value) }))
}

export function loginRateLimitKeys(accountIdentifier: string, ip: string) {
  return keys([
    { scope: 'login-email', value: accountIdentifier },
    { scope: 'login-ip', value: ip },
  ])
}

export async function loginThrottleState(loginKeys: Key[]) {
  const attempts = await prisma.loginAttempt.findMany({
    where: { OR: loginKeys },
    select: { scope: true, keyHash: true, failureCount: true, lockoutLevel: true, blockedUntil: true },
  })
  const now = Date.now()
  const blockedUntil = attempts.reduce<number>((latest, attempt) => {
    const expires = attempt.blockedUntil?.getTime() ?? 0
    return Math.max(latest, expires > now ? expires : 0)
  }, 0)
  const captchaRequired = attempts.some((attempt) => attempt.failureCount >= 5 || attempt.lockoutLevel > 0)
  return { blockedUntil, captchaRequired }
}

export async function recordLoginFailure(loginKeys: Key[]) {
  const now = new Date()
  for (const key of loginKeys) {
    const attempt = await prisma.loginAttempt.upsert({
      where: { scope_keyHash: key },
      create: { ...key, failureCount: 1, firstFailureAt: now },
      update: { failureCount: { increment: 1 } },
      select: { id: true, failureCount: true, lockoutLevel: true, blockedUntil: true },
    })

    if (attempt.failureCount >= 5 && (!attempt.blockedUntil || attempt.blockedUntil <= now)) {
      const delayMinutes = attempt.lockoutLevel === 0 ? 1 : attempt.lockoutLevel === 1 ? 5 : 15
      await prisma.loginAttempt.update({
        where: { id: attempt.id },
        data: {
          blockedUntil: new Date(now.getTime() + delayMinutes * 60_000),
          lockoutLevel: Math.min(attempt.lockoutLevel + 1, 3),
        },
      })
    }
  }
}

export async function clearLoginFailures(loginKeys: Key[]) {
  await prisma.loginAttempt.deleteMany({ where: { OR: loginKeys } })
}

export async function enforceActionRateLimit(scope: string, values: string[], limit: number, windowMs: number) {
  const now = new Date()
  for (const value of values) {
    const key = keys([{ scope, value }])[0]
    if (!key) continue
    const current = await prisma.loginAttempt.findUnique({
      where: { scope_keyHash: key },
      select: { failureCount: true, firstFailureAt: true, blockedUntil: true },
    })
    if (current?.blockedUntil && current.blockedUntil > now) {
      return Math.ceil((current.blockedUntil.getTime() - now.getTime()) / 1000)
    }
    const inWindow = current && now.getTime() - current.firstFailureAt.getTime() < windowMs
    const count = inWindow ? current.failureCount : 0
    if (count >= limit && current) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now.getTime() - current.firstFailureAt.getTime())) / 1000))
      return retryAfter
    }
    await prisma.loginAttempt.upsert({
      where: { scope_keyHash: key },
      create: { ...key, failureCount: 1, firstFailureAt: now },
      update: {
        failureCount: inWindow ? { increment: 1 } : 1,
        firstFailureAt: inWindow ? current.firstFailureAt : now,
        blockedUntil: null,
      },
    })
  }
  return 0
}

export async function clearActionRateLimit(scope: string, values: string[]) {
  const rateKeys = keys(values.map((value) => ({ scope, value })))
  if (rateKeys.length) await prisma.loginAttempt.deleteMany({ where: { OR: rateKeys } })
}

import 'server-only'

import { createHash } from 'node:crypto'
import zxcvbn from 'zxcvbn'

const COMMON_PASSWORDS = new Set([
  '12345678', 'password', 'password1', '123456789', 'qwerty123', '11111111',
  'iloveyou', 'admin123', 'welcome1', 'letmein', 'abc12345', 'monkey123',
])

export class PasswordBreachCheckUnavailableError extends Error {
  constructor() {
    super('Password breach checking is temporarily unavailable')
    this.name = 'PasswordBreachCheckUnavailableError'
  }
}

export async function validatePasswordSafety(password: string) {
  const normalized = password.normalize('NFKC').toLocaleLowerCase()
  if (COMMON_PASSWORDS.has(normalized) || zxcvbn(password).score <= 1) return 'common' as const

  const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
  const prefix = digest.slice(0, 5)
  const suffix = digest.slice(5)
  let response: Response
  try {
    response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'PersonalFinance-Password-Safety' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
  } catch {
    throw new PasswordBreachCheckUnavailableError()
  }
  if (!response.ok) throw new PasswordBreachCheckUnavailableError()

  const suffixes = (await response.text()).split(/\r?\n/).map((line) => line.split(':', 1)[0]?.trim())
  return suffixes.includes(suffix) ? 'breached' as const : null
}

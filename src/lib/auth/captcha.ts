import 'server-only'

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
}

export async function verifyTurnstile(token: string | undefined, remoteIp: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return false
  if (!token || token.length > 4096) return false

  let response: Response
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
  } catch {
    return false
  }
  if (!response.ok) return false
  const result: unknown = await response.json()
  return typeof result === 'object' && result !== null && 'success' in result && result.success === true
}

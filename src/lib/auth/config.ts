import 'server-only'

export const SESSION_COOKIE = 'ledgerly_session'
export const DEFAULT_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000
export const REMEMBERED_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000
export const DEFAULT_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
export const REMEMBERED_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000
export const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000
export const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000

export function appUrl() {
  const raw = process.env.APP_URL
  if (!raw) throw new Error('APP_URL is required for authentication links and CSRF validation')
  const url = new URL(raw)
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('APP_URL must use HTTPS in production')
  }
  return url
}

export function authSecret() {
  const value = process.env.AUTH_SECRET
  if (!value || Buffer.byteLength(value) < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 bytes')
  }
  return value
}

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

'use client'

import Link from 'next/link'
import { KeyRound, LoaderCircle, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { authMessages, localizeAuthMessage, type AuthLocale } from '@/lib/auth/messages'
import { ThemeToggle } from '@/components/theme-toggle'

type AuthPageMode = 'login'
type AuthMode = AuthPageMode | 'terms' | 'privacy'

type AuthPanelProps = {
  mode: AuthPageMode
  nextPath?: string
  callbackError?: string
}

const buttonClass = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

function isSafeNextPath(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/'
}

function AuthFrame({
  mode,
  locale,
  setLocale,
  children,
}: {
  mode: AuthMode
  locale: AuthLocale
  setLocale: (locale: AuthLocale) => void
  children: React.ReactNode
}) {
  const t = authMessages[locale]
  const title = mode === 'terms' ? t.termsTitle
    : mode === 'privacy' ? t.privacyTitle
      : t.loginTitle
  const subtitle = mode === 'terms' || mode === 'privacy' ? t.tagline
    : t.loginSubtitle

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <WalletCards aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="font-bold tracking-tight">{t.brand}</p>
              <p className="text-xs text-muted-foreground">{t.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex size-11 items-center justify-center"><ThemeToggle /></span>
            <button
              type="button"
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              aria-label={locale === 'th' ? 'Switch language to English' : 'เปลี่ยนภาษาเป็นไทย'}
            >
              {t.language}
            </button>
          </div>
        </div>
        <div className="mb-7">
          <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound aria-hidden="true" className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  )
}

function GoogleLogin({ locale, nextPath, callbackError }: { locale: AuthLocale; nextPath?: string; callbackError?: string }) {
  const t = authMessages[locale]
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptTerms: acceptedTerms, next: isSafeNextPath(nextPath) }),
      })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) {
        setError(result.error ?? t.googleFailed)
        return
      }
      window.location.assign(result.url)
    } catch {
      setError(t.googleFailed)
    } finally {
      setBusy(false)
    }
  }

  const callbackMessage = callbackError === 'profile' ? t.googleProfileConflict
    : callbackError === 'google' ? t.googleFailed : ''

  return (
    <div className="mb-6 space-y-4">
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 size-5 shrink-0 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
        <span>{t.acceptTerms} <Link href="/terms" className="font-semibold underline underline-offset-4">{t.terms}</Link> {t.and} <Link href="/privacy" className="font-semibold underline underline-offset-4">{t.privacy}</Link></span>
      </label>
      {(error || callbackMessage) && <p className="text-sm font-medium text-destructive" role="alert">{localizeAuthMessage(error || callbackMessage, locale)}</p>}
      <button type="button" className={buttonClass} disabled={busy || !acceptedTerms} onClick={signIn}>
        {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : (
          <svg aria-hidden="true" className="size-5 shrink-0 rounded-full bg-white p-0.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.19 3.32v2.77h3.55c2.08-1.92 3.28-4.74 3.28-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.55-2.77c-.98.66-2.23 1.06-3.73 1.06-2.87 0-5.3-1.94-6.17-4.55H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.65-2.84Z" />
            <path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.64 10.64 0 0 0 12 1a11 11 0 0 0-9.82 6.07l3.65 2.84C6.7 7.3 9.13 5.36 12 5.36Z" />
          </svg>
        )}
        {busy ? t.loggingIn : t.googleLogin}
      </button>
    </div>
  )
}

export function AuthPanel({ mode, nextPath, callbackError }: AuthPanelProps) {
  const [locale, setLocale] = useState<AuthLocale>('th')
  return (
    <AuthFrame mode={mode} locale={locale} setLocale={setLocale}>
      {mode === 'login' ? <GoogleLogin locale={locale} nextPath={nextPath} callbackError={callbackError} /> : null}
    </AuthFrame>
  )
}

export function LegalPanel({ page }: { page: 'terms' | 'privacy' }) {
  const [locale, setLocale] = useState<AuthLocale>('th')
  const t = authMessages[locale]
  const title = page === 'terms' ? t.termsTitle : t.privacyTitle
  const body = page === 'terms' ? t.termsBody : t.privacyBody
  return (
    <AuthFrame mode={page} locale={locale} setLocale={setLocale}>
      <article className="space-y-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{body}</p>
        <Link href="/login" className={buttonClass}>{t.login}</Link>
      </article>
    </AuthFrame>
  )
}

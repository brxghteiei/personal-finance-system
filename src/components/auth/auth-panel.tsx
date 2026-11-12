'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, WalletCards } from 'lucide-react'
import Script from 'next/script'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/auth/validation'
import { authMessages, localizeAuthMessage, type AuthLocale } from '@/lib/auth/messages'
import { ThemeToggle } from '@/components/theme-toggle'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback': () => void
        'error-callback': () => void
      }) => string
      remove: (widgetId: string) => void
    }
  }
}

type AuthPageMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify'
type AuthMode = AuthPageMode | 'terms' | 'privacy'

type AuthPanelProps = {
  mode: AuthPageMode
  token?: string
  email?: string
  nextPath?: string
  callbackError?: boolean
}

const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'
const buttonClass = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

function isSafeNextPath(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/'
}

function ErrorMessage({ id, children, locale }: { id: string; children?: string; locale?: AuthLocale }) {
  if (!children) return null
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-sm font-medium text-destructive" role="alert">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{localizeAuthMessage(children, locale ?? 'th')}</span>
    </p>
  )
}

function PasswordField({
  id,
  label,
  autoComplete,
  register,
  error,
  onChange,
  onBlur,
  inputRef,
  locale,
}: {
  id: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  register: Record<string, unknown>
  error?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  inputRef?: (element: HTMLInputElement | null) => void
  locale: AuthLocale
}) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const t = authMessages[locale]
  const registeredRef = register.ref as ((element: HTMLInputElement | null) => void) | undefined
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <div className="relative">
        <input
          {...register}
          id={id}
          ref={(element) => {
            registeredRef?.(element)
            inputRef?.(element)
          }}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className={`${fieldClass} pr-12`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(event) => {
            const handler = register.onChange as ((event: React.ChangeEvent<HTMLInputElement>) => void) | undefined
            handler?.(event)
            onChange?.(event.target.value)
          }}
          onBlur={(event) => {
            const handler = register.onBlur as ((event: React.FocusEvent<HTMLInputElement>) => void) | undefined
            handler?.(event)
            onBlur?.()
          }}
          onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
          onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-1 top-3 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={visible ? t.hidePassword : t.showPassword}
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
      <p id={`${id}-hint`} className="mt-2 text-xs text-muted-foreground">{t.passwordTip}</p>
      {capsLock && <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">{t.capsLock}</p>}
      <ErrorMessage id={`${id}-error`} locale={locale}>{error}</ErrorMessage>
    </div>
  )
}

function PasswordChecklist({
  password,
  locale,
  name = '',
  email = '',
}: {
  password: string
  locale: AuthLocale
  name?: string
  email?: string
}) {
  const t = authMessages[locale]
  const normalizedPassword = password.normalize('NFKC').toLocaleLowerCase()
  const emailName = email.trim().toLocaleLowerCase().split('@')[0] ?? ''
  const avoidsIdentity = Boolean(password) && normalizedPassword !== name.trim().toLocaleLowerCase()
    && normalizedPassword !== email.trim().toLocaleLowerCase()
    && !(emailName.length >= 4 && normalizedPassword.includes(emailName))
  const checks = [
    { valid: [...password].length >= 8, label: t.passwordRules[0] },
    { valid: [...password].length <= 128, label: t.passwordRules[1] },
    { valid: avoidsIdentity, label: t.passwordRules[2] },
  ]
  const [score, setScore] = useState(-1)
  useEffect(() => {
    if (!password) {
      setScore(-1)
      return
    }
    let active = true
    import('zxcvbn').then(({ default: zxcvbn }) => {
      if (active) setScore(zxcvbn(password).score)
    }).catch(() => {
      if (active) setScore(-2)
    })
    return () => { active = false }
  }, [password])
  const strength = score === -2
    ? t.passwordStrengthUnavailable
    : score >= 0 ? t.passwordStrength[score + 1] : t.passwordStrength[0]
  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      <p className="text-sm font-medium">{t.passwordStrengthLabel}: {strength}</p>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 aria-hidden="true" className={`size-4 ${check.valid ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-50'}`} />
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  )
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
      : mode === 'login' ? t.loginTitle
    : mode === 'register' ? t.registerTitle
      : mode === 'forgot' ? t.forgotTitle
        : mode === 'reset' ? t.resetTitle : t.verifyTitle
  const subtitle = mode === 'terms' || mode === 'privacy' ? t.tagline
    : mode === 'login' ? t.loginSubtitle
    : mode === 'register' ? t.registerSubtitle
      : mode === 'forgot' ? t.forgotSubtitle
        : mode === 'reset' ? t.resetSubtitle : t.verifySubtitle

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

type LoginInput = z.input<typeof loginSchema>
type LoginValues = z.output<typeof loginSchema>
type RegisterInput = z.input<typeof registerSchema>
type RegisterValues = z.output<typeof registerSchema>
type ForgotInput = z.input<typeof forgotPasswordSchema>
type ForgotValues = z.output<typeof forgotPasswordSchema>
type ResetInput = z.input<typeof resetPasswordSchema>
type ResetValues = z.output<typeof resetPasswordSchema>

function LoginForm({ locale, nextPath, callbackError }: { locale: AuthLocale; nextPath?: string; callbackError?: boolean }) {
  const t = authMessages[locale]
  const router = useRouter()
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const captchaContainer = useRef<HTMLDivElement | null>(null)
  const captchaWidget = useRef<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [serverError, setServerError] = useState(callbackError ? t.callbackFailed : '')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const form = useForm<LoginInput, unknown, LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { identifier: '', password: '', rememberMe: false } })
  const { register, handleSubmit, formState: { errors } } = form

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(() => setResendCooldown((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (!captchaRequired || !siteKey || !turnstileReady || !captchaContainer.current || !window.turnstile || captchaWidget.current) return
    captchaWidget.current = window.turnstile.render(captchaContainer.current, {
      sitekey: siteKey,
      callback: setCaptchaToken,
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': () => setCaptchaToken(''),
    })
    return () => {
      if (captchaWidget.current && window.turnstile) window.turnstile.remove(captchaWidget.current)
      captchaWidget.current = null
    }
  }, [captchaRequired, siteKey, turnstileReady])

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    setServerError('')
    setNotice('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, captchaToken: captchaToken || undefined }),
      })
      const result = await response.json() as { error?: string; captchaRequired?: boolean; verificationRequired?: boolean }
      if (!response.ok) {
        setServerError(result.error ?? t.serverError)
        setCaptchaRequired(Boolean(result.captchaRequired))
        if (result.verificationRequired) {
          setNeedsVerification(true)
          setNotice(t.unverified)
        } else {
          passwordRef.current?.focus()
          form.setValue('password', '')
        }
        return
      }
      router.replace(isSafeNextPath(nextPath))
      router.refresh()
    } catch {
      setServerError(t.serverError)
    } finally {
      setBusy(false)
    }
  })

  async function resendVerification() {
    try {
      const identifier = form.getValues('identifier')
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const result = await response.json() as { message?: string; error?: string }
      setNotice(response.ok ? result.message ?? t.verificationSent : result.error ?? t.serverError)
      const retryAfter = Number(response.headers.get('Retry-After'))
      if (response.ok) setResendCooldown(60)
      else if (retryAfter > 0) setResendCooldown(retryAfter)
    } catch {
      setNotice(t.serverError)
    }
  }

  return (
    <>
      {siteKey && captchaRequired && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setTurnstileReady(true)} />
          <div ref={captchaContainer} className="mb-4 min-h-16" aria-label="CAPTCHA verification" />
          {!captchaToken && <p className="mb-3 text-sm text-muted-foreground">{t.captchaRequired}</p>}
        </>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-identifier" className="text-sm font-semibold">{t.loginIdentifier}</label>
          <input
            {...register('identifier')}
            id="login-identifier"
            type="text"
            autoComplete="username"
            autoFocus
            className={fieldClass}
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
          />
          <ErrorMessage id="login-identifier-error" locale={locale}>{errors.identifier?.message}</ErrorMessage>
        </div>
        <PasswordField
          id="login-password"
          label={t.password}
          autoComplete="current-password"
          register={register('password')}
          error={errors.password?.message}
          inputRef={(element) => { passwordRef.current = element }}
          locale={locale}
        />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input {...register('rememberMe')} type="checkbox" className="size-5 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
          {t.rememberMe}
        </label>
        {serverError && <p className="flex gap-2 text-sm font-medium text-destructive" role="alert"><AlertCircle aria-hidden="true" className="size-4 shrink-0" />{localizeAuthMessage(serverError, locale)}</p>}
        {notice && <p className="flex gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />{localizeAuthMessage(notice, locale)}</p>}
        {needsVerification && (
          <div>
            <button type="button" onClick={resendVerification} disabled={resendCooldown > 0} className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60">{t.resend}</button>
            {resendCooldown > 0 && <p className="text-sm text-muted-foreground" role="status">{t.resendCooldown(resendCooldown)}</p>}
          </div>
        )}
        <button type="submit" className={buttonClass} disabled={busy || (captchaRequired && (!siteKey || !captchaToken))} aria-live="polite">
          {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {busy ? t.loggingIn : t.login}
        </button>
        <div className="flex justify-between gap-3 text-sm">
          <Link className="min-h-11 py-3 font-medium text-primary underline-offset-4 hover:underline" href="/forgot-password">{t.forgotPassword}</Link>
          <Link className="min-h-11 py-3 font-medium text-primary underline-offset-4 hover:underline" href="/register">{t.createAccount}</Link>
        </div>
      </form>
    </>
  )
}

function RegisterForm({ locale }: { locale: AuthLocale }) {
  const t = authMessages[locale]
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const form = useForm<RegisterInput, unknown, RegisterValues>({ resolver: zodResolver(registerSchema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { name: '', email: '', password: '', confirmPassword: '' } })
  const { register, handleSubmit, formState: { errors } } = form
  const watchedName = form.watch('name')
  const watchedEmail = form.watch('email')
  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    setServerError('')
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const result = await response.json() as { error?: string }
      if (!response.ok) {
        setServerError(result.error ?? t.serverError)
        return
      }
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`)
    } catch {
      setServerError(t.serverError)
    } finally {
      setBusy(false)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="register-name" className="text-sm font-semibold">{t.name}</label>
        <input {...register('name')} id="register-name" autoComplete="name" autoFocus maxLength={100} className={fieldClass} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'register-name-error' : undefined} />
        <ErrorMessage id="register-name-error" locale={locale}>{errors.name?.message}</ErrorMessage>
      </div>
      <div>
        <label htmlFor="register-email" className="text-sm font-semibold">{t.email}</label>
        <input {...register('email')} id="register-email" type="email" inputMode="email" autoComplete="username" maxLength={254} className={fieldClass} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} />
        <ErrorMessage id="register-email-error" locale={locale}>{errors.email?.message}</ErrorMessage>
      </div>
      <PasswordField id="register-password" label={t.password} autoComplete="new-password" register={register('password')} error={errors.password?.message} locale={locale} onChange={setPassword} />
      <PasswordChecklist
        password={password}
        locale={locale}
        name={typeof watchedName === 'string' ? watchedName : ''}
        email={typeof watchedEmail === 'string' ? watchedEmail : ''}
      />
      <PasswordField id="register-confirm" label={t.confirmPassword} autoComplete="new-password" register={register('confirmPassword')} error={errors.confirmPassword?.message} locale={locale} />
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
        <input {...register('acceptTerms')} type="checkbox" className="mt-1 size-5 shrink-0 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={Boolean(errors.acceptTerms)} aria-describedby={errors.acceptTerms ? 'register-terms-error' : undefined} />
        <span>{t.acceptTerms} <Link href="/terms" className="font-semibold underline underline-offset-4">{t.terms}</Link> {t.and} <Link href="/privacy" className="font-semibold underline underline-offset-4">{t.privacy}</Link></span>
      </label>
      <ErrorMessage id="register-terms-error" locale={locale}>{errors.acceptTerms?.message}</ErrorMessage>
      {serverError && <p className="flex gap-2 text-sm font-medium text-destructive" role="alert"><AlertCircle aria-hidden="true" className="size-4 shrink-0" />{localizeAuthMessage(serverError, locale)}</p>}
      <button type="submit" className={buttonClass} disabled={busy} aria-live="polite">
        {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {busy ? t.registering : t.register}
      </button>
      <p className="text-center text-sm text-muted-foreground">{t.haveAccount} <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">{t.login}</Link></p>
    </form>
  )
}

function ForgotForm({ locale, initialEmail }: { locale: AuthLocale; initialEmail?: string }) {
  const t = authMessages[locale]
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const form = useForm<ForgotInput, unknown, ForgotValues>({ resolver: zodResolver(forgotPasswordSchema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { email: initialEmail ?? '' } })
  const { register, handleSubmit, formState: { errors } } = form
  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])
  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    setServerError('')
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      if (!response.ok) {
        const result = await response.json() as { error?: string }
        setServerError(result.error ?? t.serverError)
        return
      }
      setSent(true)
      setCountdown(60)
    } catch {
      setServerError(t.serverError)
    } finally {
      setBusy(false)
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="forgot-email" className="text-sm font-semibold">{t.email}</label>
        <input {...register('email')} id="forgot-email" type="email" inputMode="email" autoComplete="username" autoFocus className={fieldClass} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'forgot-email-error' : undefined} />
        <ErrorMessage id="forgot-email-error" locale={locale}>{errors.email?.message}</ErrorMessage>
      </div>
      {serverError && <p className="text-sm font-medium text-destructive" role="alert">{localizeAuthMessage(serverError, locale)}</p>}
      {sent && <p className="flex gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />{t.resetSent}</p>}
      {countdown > 0 && <p className="text-sm text-muted-foreground" role="status">{t.resendCooldown(countdown)}</p>}
      <button type="submit" className={buttonClass} disabled={busy || countdown > 0} aria-live="polite">
        {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {busy ? t.sending : t.sendReset}
      </button>
      <p className="text-center"><Link href="/login" className="min-h-11 inline-flex items-center font-semibold text-primary underline-offset-4 hover:underline">{t.backToLogin}</Link></p>
    </form>
  )
}

function ResetForm({ locale, token }: { locale: AuthLocale; token?: string }) {
  const t = authMessages[locale]
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const form = useForm<ResetInput, unknown, ResetValues>({ resolver: zodResolver(resetPasswordSchema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { password: '', confirmPassword: '' } })
  const { register, handleSubmit, formState: { errors } } = form
  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    setServerError('')
    try {
      const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const result = await response.json() as { error?: string; passwordChanged?: boolean }
      if (!response.ok && !result.passwordChanged) {
        setServerError(result.error ?? t.serverError)
        return
      }
      if (!response.ok) setServerError(result.error ?? t.serverError)
      setSuccess(true)
      window.setTimeout(() => router.replace('/login?passwordReset=1'), 3000)
    } catch {
      setServerError(t.serverError)
    } finally {
      setBusy(false)
    }
  })

  if (!token) {
    return <InvalidLink locale={locale} text={t.resetInvalid} />
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <PasswordField id="reset-password" label={t.password} autoComplete="new-password" register={register('password')} error={errors.password?.message} locale={locale} onChange={setPassword} />
        <PasswordChecklist password={password} locale={locale} />
      </div>
      <PasswordField id="reset-confirm" label={t.confirmPassword} autoComplete="new-password" register={register('confirmPassword')} error={errors.confirmPassword?.message} locale={locale} />
      {serverError && <p className="flex gap-2 text-sm font-medium text-destructive" role="alert"><AlertCircle aria-hidden="true" className="size-4 shrink-0" />{localizeAuthMessage(serverError, locale)}</p>}
      {success && <p className="flex gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />{t.resetSuccess}</p>}
      <button type="submit" className={buttonClass} disabled={busy || success} aria-live="polite">
        {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {busy ? t.sending : t.resetButton}
      </button>
    </form>
  )
}

function InvalidLink({ locale, text }: { locale: AuthLocale; text: string }) {
  const t = authMessages[locale]
  return (
    <div className="space-y-5">
      <p className="flex gap-2 text-sm font-medium text-destructive" role="alert"><AlertCircle aria-hidden="true" className="size-4 shrink-0" />{text}</p>
      <Link href="/forgot-password" className={`${buttonClass} no-underline`}>{t.requestNewLink}</Link>
    </div>
  )
}

function VerifyPanel({ locale, token, initialEmail }: { locale: AuthLocale; token?: string; initialEmail?: string }) {
  const t = authMessages[locale]
  const [status, setStatus] = useState<'pending' | 'success' | 'invalid' | 'idle'>('idle')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [email, setEmail] = useState(initialEmail ?? '')
  const attempted = useRef(false)

  useEffect(() => {
    if (token === 'verified') {
      setStatus('success')
      return
    }
    if (!token || attempted.current) return
    attempted.current = true
    setStatus('pending')
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      if (response.ok) setStatus('success')
      else setStatus('invalid')
    }).catch(() => setStatus('invalid'))
  }, [token])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  async function resend() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) {
        setError(result.error ?? t.serverError)
        const retry = Number(response.headers.get('Retry-After'))
        if (retry > 0) setCountdown(retry)
      } else {
        setError(t.verificationSent)
        setCountdown(60)
      }
    } catch {
      setError(t.serverError)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'pending') {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{t.sending}</p>
  }
  if (status === 'success') {
    return <div className="space-y-5"><p className="flex gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />{t.verifySuccess}</p><Link href="/login" className={buttonClass}>{t.login}</Link></div>
  }
  if (status === 'invalid' && token) {
    return <div className="space-y-5"><InvalidLink locale={locale} text={t.verifyInvalid} /><ResendForm email={email} setEmail={setEmail} resend={resend} busy={busy} countdown={countdown} error={error} locale={locale} /></div>
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t.verifySubtitle}</p>
      <ResendForm email={email} setEmail={setEmail} resend={resend} busy={busy} countdown={countdown} error={error} locale={locale} />
      <p className="text-center"><Link href="/login" className="min-h-11 inline-flex items-center font-semibold text-primary underline-offset-4 hover:underline">{t.backToLogin}</Link></p>
    </div>
  )
}

function ResendForm({
  email,
  setEmail,
  resend,
  busy,
  countdown,
  error,
  locale,
}: {
  email: string
  setEmail: (value: string) => void
  resend: () => void
  busy: boolean
  countdown: number
  error: string
  locale: AuthLocale
}) {
  const t = authMessages[locale]
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="verify-email" className="text-sm font-semibold">{t.email}</label>
        <input id="verify-email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
      </div>
      {error && <p className="text-sm font-medium" role="status">{localizeAuthMessage(error, locale)}</p>}
      {countdown > 0 && <p className="text-sm text-muted-foreground" role="status">{t.resendCooldown(countdown)}</p>}
      <button type="button" onClick={resend} disabled={busy || countdown > 0} className={buttonClass}>
        {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {busy ? t.sending : t.resend}
      </button>
    </div>
  )
}

export function AuthPanel({ mode, token, email: initialEmail, nextPath, callbackError }: AuthPanelProps) {
  const [locale, setLocale] = useState<AuthLocale>('th')
  return (
    <AuthFrame mode={mode} locale={locale} setLocale={setLocale}>
      {mode === 'login' ? <LoginForm locale={locale} nextPath={nextPath} callbackError={callbackError} />
        : mode === 'register' ? <RegisterForm locale={locale} />
          : mode === 'forgot' ? <ForgotForm locale={locale} initialEmail={initialEmail} />
            : mode === 'reset' ? <ResetForm locale={locale} token={token} />
              : <VerifyPanel locale={locale} token={token} initialEmail={initialEmail} />}
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
        <Link href="/register" className={buttonClass}>{t.createAccount}</Link>
      </article>
    </AuthFrame>
  )
}

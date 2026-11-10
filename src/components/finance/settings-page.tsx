'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Check, Moon, Settings2, Sun, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/hooks/use-mounted'
import { isCurrencyCode, type CurrencyCode } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { PageIntro } from './page-intro'
import { Panel } from './panel'
import { useFinance } from './finance-provider'

const THEME_OPTIONS = [
  { id: 'dark', label: m.pages.settings.dark, icon: Moon },
  { id: 'light', label: m.pages.settings.light, icon: Sun },
] as const

export function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const { settings, saveSettings } = useFinance()
  const mounted = useMounted()
  const current = mounted ? resolvedTheme : undefined
  const [displayName, setDisplayName] = useState(settings.displayName)
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(settings.displayName)
    setCurrency(settings.currency)
  }, [settings])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = displayName.trim()
    if (!name) {
      setError(m.pages.settings.displayNameRequired)
      setSaved(false)
      return
    }

    try {
      saveSettings({ displayName: name, currency })
      setSaved(true)
      setError(null)
    } catch (cause) {
      setSaved(false)
      setError(cause instanceof Error ? cause.message : 'บันทึกการตั้งค่าไม่สำเร็จ')
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.settings.eyebrow}
        title={m.pages.settings.title}
        description={m.pages.settings.description}
      />
      <Panel>
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
            <Settings2 />
          </span>
          <div>
            <h2 className="font-semibold">{m.pages.settings.appearance}</h2>
            <p className="text-sm text-muted-foreground">{m.pages.settings.appearanceDesc}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-6 sm:flex-row">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={current === id}
              className={cn(
                'flex flex-1 items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                current === id ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary',
              )}
            >
              <Icon className="text-primary" />
              <span className="font-medium">{label}</span>
              {current === id && <Check className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="flex items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
            <Wallet />
          </span>
          <div>
            <h2 className="font-semibold">{m.pages.settings.profile}</h2>
            <p className="text-sm text-muted-foreground">{m.pages.settings.profileDesc}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              {m.pages.settings.displayName}
              <input
                required
                maxLength={80}
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setSaved(false)
                }}
                className="h-10 rounded-md border border-input bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              {m.pages.settings.currency}
              <select
                value={currency}
                onChange={(event) => {
                  if (isCurrencyCode(event.target.value)) setCurrency(event.target.value)
                  setSaved(false)
                }}
                className="h-10 rounded-md border border-input bg-background px-3"
              >
                {m.pages.settings.currencies.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">{m.pages.settings.currencyDesc}</span>
            </label>
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-expense">{error}</p>}
          {saved && <p role="status" className="mt-4 text-sm text-income">{m.pages.settings.saved}</p>}
          <Button type="submit" className="mt-6">{m.pages.settings.save}</Button>
        </form>
      </Panel>
    </main>
  )
}

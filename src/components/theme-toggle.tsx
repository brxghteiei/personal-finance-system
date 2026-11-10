'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/hooks/use-mounted'
import { messages as m } from '@/lib/messages'

/** One-click light/dark switch. next-themes stores the choice in localStorage and sets class="dark" on <html>. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  // Before hydration the real theme is unknown (it lives in localStorage), so render an inert placeholder
  // of the same size. This avoids a server/client markup mismatch.
  if (!mounted) return <Button variant="ghost" size="icon" aria-hidden="true" tabIndex={-1} disabled />

  const isDark = resolvedTheme !== 'light'
  const label = isDark ? m.theme.toLight : m.theme.toDark

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}

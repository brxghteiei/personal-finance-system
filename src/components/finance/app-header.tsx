'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { CalendarDays, ChartNoAxesCombined, House, PieChart, ReceiptText, RotateCcw, Tags, Wallet } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { useFinance } from './finance-provider'

const NAV_ITEMS = [
  { href: '/', label: m.nav.overview, icon: House },
  { href: '/transactions', label: m.nav.transactions, icon: ReceiptText },
  { href: '/recently-deleted', label: m.nav.recentlyDeleted, icon: RotateCcw },
  { href: '/calendar', label: m.nav.calendar, icon: CalendarDays },
  { href: '/categories', label: m.nav.categories, icon: Tags },
  { href: '/budgets', label: m.nav.budgets, icon: Wallet },
  { href: '/reports', label: m.nav.reports, icon: ChartNoAxesCombined },
] as const

export function AppHeader() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-border bg-card px-2 py-4 md:w-64 md:px-4">
      <Link href="/" className="mb-8 flex items-center justify-center gap-3 md:justify-start">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white">
          <Image src="/icon.svg" alt="" width={24} height={24} />
        </span>
        <span className="hidden text-lg font-semibold tracking-tight md:inline">{m.brand}</span>
      </Link>

      <nav aria-label={m.nav.label}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'flex items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-secondary hover:text-foreground md:justify-start',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/settings"
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          aria-label={m.nav.settings}
          title={m.nav.settings}
          className={cn(
            'flex items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-secondary hover:text-foreground md:justify-start',
            pathname.startsWith('/settings') ? 'bg-secondary text-foreground' : 'text-muted-foreground',
          )}
        >
          <PieChart aria-hidden="true" className="size-5 shrink-0" />
          <span className="hidden md:inline">{m.nav.settings}</span>
        </Link>
      </div>
    </aside>
  )
}

export function AppToolbar() {
  const pathname = usePathname()
  const { selectedMonth, setSelectedMonth } = useFinance()

  return (
    <header className="flex min-h-16 items-center justify-end gap-3 border-b border-border px-4 md:px-8">
      {pathname === '/' && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">{m.nav.monthLabel}</span>
          <input
            aria-label={m.nav.monthLabel}
            type="month"
            value={selectedMonth}
            onChange={(event) => {
              if (event.target.value) setSelectedMonth(event.target.value)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      )}
      <ThemeToggle />
    </header>
  )
}

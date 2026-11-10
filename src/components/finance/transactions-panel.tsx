'use client'

import { useState } from 'react'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type CurrencyCode, type Transaction, formatCurrency, formatShortDate, type TransactionType } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { TransactionForm } from './transaction-form'

type Props = {
  transactions: Transaction[]
  categories: Record<TransactionType, string[]>
  currency: CurrencyCode
  onAdd: (t: Omit<Transaction, 'id'>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  className?: string
}

const filters = [
  { value: 'all', label: m.transactionsPanel.all },
  { value: 'income', label: m.transactionsPanel.income },
  { value: 'expense', label: m.transactionsPanel.expense },
] as const

export function TransactionsPanel({ transactions, categories, currency, onAdd, onRemove, className }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<(typeof filters)[number]['value']>('all')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = transactions
    .filter((t) => filter === 'all' || t.type === filter)
    .filter((t) => !q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section aria-labelledby="tx-heading" className={cn('flex flex-col rounded-xl border border-border bg-card', className)}>
      <div className="flex flex-col gap-4 border-b border-border p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id="tx-heading" className="font-semibold">
            {m.transactionsPanel.title}
          </h2>
          <Button data-tour="add-transaction" size="sm" onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
            {formOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {formOpen ? m.transactionsPanel.close : m.transactionsPanel.add}
          </Button>
        </div>

        {formOpen && (
          <TransactionForm
            categories={categories}
            onSubmit={async (t) => {
              await onAdd(t)
              setFormOpen(false)
            }}
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label={m.transactionsPanel.filterAria} className="flex gap-1 rounded-lg bg-secondary p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cn(
                  'rounded-md px-3 py-1 text-sm transition-all duration-200 motion-safe:active:scale-95',
                  filter === f.value && f.value === 'income' &&
                    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400',
                  filter === f.value && f.value === 'expense' &&
                    'bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:text-slate-950 dark:hover:bg-red-400',
                  filter === f.value && f.value === 'all' && 'bg-card text-foreground shadow-sm',
                  filter !== f.value && 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative flex items-center">
            <span className="sr-only">{m.transactionsPanel.search}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={m.transactionsPanel.search}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
            />
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{m.transactionsPanel.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((t) => (
            <li key={t.id} className="group flex items-center gap-4 px-6 py-3">
              <time dateTime={t.date} className="w-16 shrink-0 text-xs text-muted-foreground">
                {formatShortDate(t.date)}
              </time>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{t.description}</span>
                <span className="text-xs text-muted-foreground">{t.category}</span>
              </div>
              <span
                className={cn(
                  'font-mono text-sm tabular-nums',
                  t.type === 'income' ? 'text-income' : 'text-foreground',
                )}
              >
                {t.type === 'income' ? '+' : '−'}
                {formatCurrency(t.amount, currency)}
              </span>
              <button
                type="button"
                onClick={() => {
                  void onRemove(t.id).catch(() => undefined)
                }}
                aria-label={m.transactionsPanel.deleteAria(t.description)}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-expense focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

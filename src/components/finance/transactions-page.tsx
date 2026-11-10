'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatFullDate, type Transaction } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { useFinance } from './finance-provider'
import { PageIntro } from './page-intro'
import { Panel } from './panel'
import { TransactionForm } from './transaction-form'

export function TransactionsPage() {
  const { transactions, categories, currency, addTransaction, updateTransaction, removeTransaction } = useFinance()
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [query, setQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedDay, setSelectedDay] = useState('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const q = query.toLowerCase()
  const years = [...new Set(transactions.map((transaction) => transaction.date.slice(0, 4)))].sort().reverse()
  const visible = transactions.filter(
    (t) =>
      (filter === 'all' || t.type === filter) &&
      (selectedYear === 'all' || t.date.slice(0, 4) === selectedYear) &&
      (selectedMonth === 'all' || t.date.slice(5, 7) === selectedMonth) &&
      (selectedDay === 'all' || String(Number(t.date.slice(8, 10))) === selectedDay) &&
      (!q || `${t.description} ${t.category}`.toLowerCase().includes(q)),
  )

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.transactions.eyebrow}
        title={m.pages.transactions.title}
        description={m.pages.transactions.description}
        action={
          <Button onClick={() => {
            setEditingTransaction(null)
            setOpen((v) => !v)
          }}>
            <Plus data-icon="inline-start" /> {m.pages.transactions.add}
          </Button>
        }
      />
      {editingTransaction && (
        <TransactionForm
          key={editingTransaction.id}
          categories={categories}
          initialTransaction={editingTransaction}
          onSubmit={async (values) => {
            await updateTransaction({ ...values, id: editingTransaction.id })
            setEditingTransaction(null)
          }}
          onCancel={() => setEditingTransaction(null)}
        />
      )}
      {open && (
        <TransactionForm
          categories={categories}
          onSubmit={async (t) => {
            await addTransaction(t)
            setOpen(false)
          }}
        />
      )}
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {(['all', 'income', 'expense'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm',
                  filter === item ? 'bg-card text-foreground' : 'text-muted-foreground',
                )}
              >
                {item === 'all' ? m.pages.transactions.all : item === 'expense' ? m.pages.transactions.expense : m.pages.transactions.income}
              </button>
            ))}
          </div>
          <Button
          data-tour="transaction-filters"
          type="button"
          variant="outline"
            size="icon"
            aria-label="เปิดตัวกรองการค้นหา"
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? 'transaction-search-panel' : undefined}
            onClick={() => setSearchOpen(true)}
            className="relative"
          >
            <SlidersHorizontal aria-hidden="true" />
            {(query || selectedYear !== 'all' || selectedMonth !== 'all' || selectedDay !== 'all') && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
        <div className="divide-y divide-border">
          {visible.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 py-4">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  t.type === 'income' ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense',
                )}
              >
                {t.type === 'income' ? <ArrowDownLeft /> : <ArrowUpRight />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.category} · {formatFullDate(t.date)}
                </p>
              </div>
              <p className={cn('font-mono text-sm tabular-nums', t.type === 'income' ? 'text-income' : 'text-foreground')}>
                {t.type === 'income' ? '+' : '−'}
                {formatCurrency(t.amount, currency)}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.transactionsPanel.editAria(t.description)}
                  onClick={() => {
                    setOpen(false)
                    setEditingTransaction(t)
                  }}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.transactionsPanel.deleteAria(t.description)}
                  onClick={() => {
                    void removeTransaction(t.id).catch(() => undefined)
                  }}
                >
                  <Trash2 aria-hidden="true" className="text-expense" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {visible.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {m.transactionsPanel.empty}
          </p>
        )}
      </Panel>
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSearchOpen(false)}
        >
          <aside
            id="transaction-search-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-search-title"
            className="flex h-full w-full max-w-sm flex-col border-l border-border bg-card p-5 text-card-foreground shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchOpen(false)
            }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 id="transaction-search-title" className="text-lg font-semibold">
                ค้นหารายการ
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="ปิดตัวกรองการค้นหา"
                onClick={() => setSearchOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                รายละเอียดหรือหมวดหมู่
                <div className="relative">
                  <Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    autoFocus
                    aria-label={m.pages.transactions.search}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={m.pages.transactions.search}
                    className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                ปี
                <select
                  aria-label="กรองตามปี"
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">ทุกปี</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                เดือน
                <select
                  aria-label="กรองตามเดือน"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">ทุกเดือน</option>
                  {Array.from({ length: 12 }, (_, index) => {
                    const month = String(index + 1).padStart(2, '0')
                    const label = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { month: 'long', timeZone: 'UTC' })
                      .format(new Date(Date.UTC(2026, index, 1)))
                    return <option key={month} value={month}>{label}</option>
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                วัน
                <select
                  aria-label="กรองตามวัน"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">ทุกวัน</option>
                  {Array.from({ length: 31 }, (_, index) => {
                    const day = String(index + 1)
                    return <option key={day} value={day}>{day}</option>
                  })}
                </select>
              </label>
            </div>
            <div className="mt-auto flex gap-2 border-t border-border pt-5">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setQuery('')
                  setSelectedYear('all')
                  setSelectedMonth('all')
                  setSelectedDay('all')
                }}
              >
                ล้างตัวกรอง
              </Button>
              <Button type="button" className="flex-1" onClick={() => setSearchOpen(false)}>
                <Search data-icon="inline-start" />
                ค้นหา
              </Button>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

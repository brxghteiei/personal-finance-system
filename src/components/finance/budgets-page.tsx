'use client'

import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, formatCurrency, monthKey, monthLabel, spendingByCategory, todayDate, type Budget } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { useFinance } from './finance-provider'
import { PageIntro } from './page-intro'
import { Panel } from './panel'

const fieldClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function BudgetsPage() {
  const { budgets, categories, currency, transactions, addBudget } = useFinance()
  const [formOpen, setFormOpen] = useState(false)
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0])
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const budgetMonth = monthKey(todayDate())
  const monthTransactions = transactions.filter((transaction) => monthKey(transaction.date) === budgetMonth)
  const monthBudgets = budgets.filter((budget) => budget.month === budgetMonth)
  const spent = new Map(spendingByCategory(monthTransactions).map((r) => [r.category, r.amount]))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(limit)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('กรุณาระบุวงเงินที่มากกว่า 0')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await addBudget({ category, limit: Math.round(amount * 100) / 100, month: budgetMonth })
      setLimit('')
      setFormOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกงบประมาณไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.budgets.eyebrow}
        title={m.pages.budgets.title}
        description={`${m.pages.budgets.description} · ${monthLabel(budgetMonth, 'long')}`}
        action={
          <Button data-tour="create-budget" onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen}>
            <Plus data-icon="inline-start" /> {m.pages.budgets.create}
          </Button>
        }
      />
      {formOpen && (
        <Panel>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <label className="flex flex-col gap-1.5 text-sm">
              หมวดหมู่รายจ่าย
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
                {categories.expense.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              วงเงินต่อเดือน (บาท)
              <input
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                required
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className={fieldClass}
                placeholder="เช่น 5000"
              />
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึกงบประมาณ'}
            </Button>
            {error && <p role="alert" className="text-sm text-expense sm:col-span-3">{error}</p>}
            <p className="text-sm text-muted-foreground sm:col-span-3">
              สำหรับเดือน {budgetMonth} หากหมวดนี้มีงบอยู่แล้ว วงเงินเดิมจะถูกแทนที่
            </p>
          </form>
        </Panel>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {monthBudgets.map((b: Budget) => {
          const used = spent.get(b.category) ?? 0
          const pct = Math.min((used / b.limit) * 100, 100)
          const over = used > b.limit
          return (
            <Panel key={b.category} className="flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{b.category}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.pages.budgets.monthlyLimit}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Target />
                </span>
              </div>
              <div className="flex items-end justify-between">
                <p className="font-mono text-2xl tabular-nums">
                  {formatCurrency(used, currency)}{' '}
                  <span className="text-sm text-muted-foreground">/ {formatCurrency(b.limit, currency)}</span>
                </p>
                <p className={cn('font-mono text-xs', over ? 'text-expense' : 'text-muted-foreground')}>
                  {over ? m.pages.budgets.over : m.pages.budgets.left(formatCurrency(b.limit - used, currency))}
                </p>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className={cn('h-full rounded-full', over ? 'bg-expense' : pct > 80 ? 'bg-primary' : 'bg-muted-foreground')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Panel>
          )
        })}
        {monthBudgets.length === 0 && !formOpen && (
          <Panel className="text-sm text-muted-foreground">ยังไม่มีงบประมาณสำหรับเดือนนี้ กด “สร้างงบประมาณ” เพื่อเริ่มต้น</Panel>
        )}
      </div>
    </main>
  )
}

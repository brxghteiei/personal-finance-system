'use client'

import { useState } from 'react'
import { EyeOff, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, spendingByCategory, type TransactionType } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { useFinance } from './finance-provider'
import { PageIntro } from './page-intro'
import { Panel } from './panel'

const fieldClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function CategoriesPage() {
  const { transactions, categories, currency, addCategory, updateCategory, removeCategory } = useFinance()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ name: string; type: TransactionType } | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; type: TransactionType } | null>(null)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const expenseAmounts = new Map(spendingByCategory(transactions).map((row) => [row.category, row.amount]))
  const incomeAmounts = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.type === 'income') {
      incomeAmounts.set(transaction.category, (incomeAmounts.get(transaction.category) ?? 0) + transaction.amount)
    }
  }

  const groups = [
    {
      type: 'expense' as const,
      label: m.form.expense,
      rows: categories.expense.map((category) => ({ category, amount: expenseAmounts.get(category) ?? 0 })),
    },
    {
      type: 'income' as const,
      label: m.form.income,
      rows: categories.income.map((category) => ({ category, amount: incomeAmounts.get(category) ?? 0 })),
    },
  ]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('กรุณาระบุชื่อหมวดหมู่')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.name, editingCategory.type, trimmedName)
      } else {
        await addCategory(trimmedName, type)
      }
      setName('')
      setEditingCategory(null)
      setFormOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกหมวดหมู่ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmRemoveCategory() {
    if (!categoryToDelete) return

    setDeletingCategory(true)
    setError(null)
    try {
      await removeCategory(categoryToDelete.name, categoryToDelete.type)
      setCategoryToDelete(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ลบหมวดหมู่ไม่สำเร็จ')
    } finally {
      setDeletingCategory(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.categories.eyebrow}
        title={m.pages.categories.title}
        description={m.pages.categories.description}
        action={
          <Button variant="outline" onClick={() => {
            setEditingCategory(null)
            setName('')
            setError(null)
            setFormOpen((open) => !open)
          }} aria-expanded={formOpen}>
            <Plus data-icon="inline-start" /> {m.pages.categories.new}
          </Button>
        }
      />
      {formOpen && (
        <Panel>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <label className="flex flex-col gap-1.5 text-sm">
              {m.pages.categories.name}
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              {m.pages.categories.type}
              <select
                value={editingCategory?.type ?? type}
                disabled={Boolean(editingCategory)}
                onChange={(event) => setType(event.target.value as TransactionType)}
                className={fieldClass}
              >
                <option value="expense">{m.form.expense}</option>
                <option value="income">{m.form.income}</option>
              </select>
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? m.pages.categories.saving : editingCategory ? m.pages.categories.update : m.pages.categories.create}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setFormOpen(false)
                  setEditingCategory(null)
                  setError(null)
                }}
              >
                {m.pages.categories.cancel}
              </Button>
            </div>
            {error && <p role="alert" className="text-sm text-expense sm:col-span-3">{error}</p>}
          </form>
        </Panel>
      )}
      {groups.map((group) => {
        const total = group.rows.reduce((sum, row) => sum + row.amount, 0)
        return (
          <section key={group.type} className="flex flex-col gap-4">
            <h2 className="font-semibold">{group.label}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {group.rows.map((row, index) => {
                const percent = total ? (row.amount / total) * 100 : 0
                return (
                  <Panel key={row.category} className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Tag />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={m.pages.categories.editAria(row.category)}
                          onClick={() => {
                            setEditingCategory({ name: row.category, type: group.type })
                            setName(row.category)
                            setType(group.type)
                            setError(null)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={m.pages.categories.deleteAria(row.category)}
                          onClick={() => {
                            setError(null)
                            setCategoryToDelete({ name: row.category, type: group.type })
                          }}
                        >
                          <Trash2 aria-hidden="true" className="text-expense" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{row.category}</p>
                      <p className="mt-1 font-mono text-xl tabular-nums">{formatCurrency(row.amount, currency)}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary">
                      <div
                        className={cn('h-full rounded-full', index % 3 === 0 ? 'bg-primary' : 'bg-muted-foreground')}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </Panel>
                )
              })}
            </div>
          </section>
        )
      })}
      {error && !formOpen && <p role="alert" className="text-sm text-expense">{error}</p>}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!deletingCategory) setCategoryToDelete(null)
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            aria-describedby="delete-category-description"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !deletingCategory) setCategoryToDelete(null)
            }}
          >
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-expense/10 text-expense">
                <EyeOff aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 id="delete-category-title" className="text-lg font-semibold">
                  ซ่อนหมวดหมู่นี้?
                </h2>
                <p id="delete-category-description" className="mt-2 text-sm leading-6 text-muted-foreground">
                  หมวดหมู่ <span className="font-medium text-foreground">“{categoryToDelete.name}”</span>{' '}
                  จะไม่แสดงให้เลือกในรายการใหม่ แต่ธุรกรรมและงบประมาณเดิมจะยังคงอยู่
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={deletingCategory}
                autoFocus
                onClick={() => setCategoryToDelete(null)}
              >
                {m.pages.categories.cancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletingCategory}
                onClick={() => void handleConfirmRemoveCategory()}
              >
                <EyeOff data-icon="inline-start" />
                {deletingCategory ? 'กำลังซ่อน…' : 'ซ่อนหมวดหมู่'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

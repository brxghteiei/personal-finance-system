'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { currentTime, todayDate, type Transaction, type TransactionType } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'

const fieldClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function TransactionForm({
  categories,
  onSubmit,
  initialTransaction,
  onCancel,
}: {
  categories: Record<TransactionType, string[]>
  onSubmit: (t: Omit<Transaction, 'id'>) => Promise<void>
  initialTransaction?: Transaction
  onCancel?: () => void
}) {
  const [type, setType] = useState<TransactionType>(initialTransaction?.type ?? 'expense')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const description = String(data.get('description') ?? '').trim()
    const amount = Number(data.get('amount'))
    const date = String(data.get('date') ?? '')
    const time = String(data.get('time') ?? '')
    const category = String(data.get('category') ?? '')

    if (!description) return setError(m.form.errorDescription)
    if (!Number.isFinite(amount) || amount <= 0) return setError(m.form.errorAmount)
    const parsedDate = new Date(`${date}T00:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) return setError(m.form.errorDate)
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return setError(m.form.errorTime)

    setError(null)
    setSaving(true)
    try {
      await onSubmit({ description, amount: Math.round(amount * 100) / 100, date, time, category, type })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกรายการไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg bg-secondary p-4" noValidate>
      <div role="radiogroup" aria-label={m.form.typeAria} className="flex gap-2">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              'rounded-md border px-3 py-1 text-sm transition-colors',
              type === t
                ? t === 'income'
                  ? 'border-income text-income'
                  : 'border-expense text-expense'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'income' ? m.form.income : m.form.expense}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          {m.form.time}
          <input
            name="time"
            type="time"
            required
            defaultValue={initialTransaction?.time ?? currentTime()}
            className={cn(fieldClass, 'font-mono')}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          {m.form.date}
          <input
            name="date"
            type="date"
            required
            defaultValue={initialTransaction?.date ?? todayDate()}
            className={cn(fieldClass, 'font-mono')}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          {m.form.description}
          <input
            name="description"
            required
            maxLength={80}
            defaultValue={initialTransaction?.description}
            className={fieldClass}
            placeholder={m.form.descriptionPlaceholder}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          {m.form.amount}
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            defaultValue={initialTransaction?.amount}
            className={cn(fieldClass, 'font-mono')}
            placeholder="0.00"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          {m.form.category}
          <select key={type} name="category" defaultValue={initialTransaction?.category} className={fieldClass}>
            {[...new Set([
              ...categories[type],
              ...(initialTransaction?.type === type ? [initialTransaction.category] : []),
            ])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'กำลังบันทึก…' : initialTransaction ? m.form.update : m.form.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            {m.form.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}

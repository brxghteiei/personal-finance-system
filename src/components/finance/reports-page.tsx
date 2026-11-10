'use client'

import { CalendarDays, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, spendingByCategory, totals } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { useFinance } from './finance-provider'
import { PageIntro } from './page-intro'
import { Panel } from './panel'

function escapeCsv(value: string | number) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function ReportsPage() {
  const { currency, transactions } = useFinance()
  const t = totals(transactions)
  const rows = spendingByCategory(transactions)
  const savingsRate = t.income ? `${((t.net / t.income) * 100).toFixed(0)}%` : '—'

  function exportReport() {
    const csvRows = [
      [m.pages.reports.title, `ทุกช่วงเวลา (${currency})`],
      [],
      [m.pages.reports.totalIncome, t.income],
      [m.pages.reports.totalExpense, t.expense],
      [m.pages.reports.savingsRate, savingsRate],
      [],
      [m.pages.reports.byCategory],
      [m.pages.categories.title, m.pages.reports.totalExpense],
      ...rows.map((row) => [row.category, row.amount]),
    ]
    const csv = `\uFEFF${csvRows.map((row) => row.map((value) => escapeCsv(value ?? '')).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'รายงานการเงิน-ทั้งหมด.csv'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.reports.eyebrow}
        title={m.pages.reports.title}
        description={m.pages.reports.description}
        action={
          <Button variant="outline" onClick={exportReport}>
            <Download data-icon="inline-start" /> {m.pages.reports.export}
          </Button>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <Panel>
          <p className="text-sm text-muted-foreground">{m.pages.reports.totalIncome}</p>
          <p className="mt-3 font-mono text-3xl text-income tabular-nums">{formatCurrency(t.income, currency)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted-foreground">{m.pages.reports.totalExpense}</p>
          <p className="mt-3 font-mono text-3xl text-expense tabular-nums">{formatCurrency(t.expense, currency)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted-foreground">{m.pages.reports.savingsRate}</p>
          <p className="mt-3 font-mono text-3xl tabular-nums">
            {savingsRate}
          </p>
        </Panel>
      </div>
      <Panel>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{m.pages.reports.byCategory}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.pages.reports.byCategoryDesc}</p>
          </div>
          <CalendarDays className="text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-5">
          {rows.map((r) => (
            <div key={r.category} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-sm">{r.category}</span>
              <div className="h-2 flex-1 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(r.amount / (rows[0]?.amount || 1)) * 100}%` }}
                />
              </div>
              <span className="w-24 text-right font-mono text-sm tabular-nums">{formatCurrency(r.amount, currency)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </main>
  )
}

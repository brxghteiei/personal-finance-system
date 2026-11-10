'use client'

import { useMemo } from 'react'
import { monthLabel, monthlySeries, monthKey, totals } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { BudgetList } from './budget-list'
import { CashflowChart } from './cashflow-chart'
import { CategoryBreakdown } from './category-breakdown'
import { useFinance } from './finance-provider'
import { MonthStatement } from './month-statement'
import { TransactionsPanel } from './transactions-panel'

export function FinanceDashboard() {
  const {
    transactions,
    budgets,
    categories,
    currency,
    months,
    selectedMonth,
    monthTransactions,
    addTransaction,
    removeTransaction,
    loading,
  } = useFinance()

  const previousMonth = months.find((month) => month < selectedMonth)
  const previousTotals = useMemo(
    () => (previousMonth ? totals(transactions.filter((t) => monthKey(t.date) === previousMonth)) : null),
    [transactions, previousMonth],
  )
  const series = useMemo(() => monthlySeries(monthTransactions), [monthTransactions])
  const monthBudgets = budgets.filter((budget) => budget.month === selectedMonth)

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="sr-only">{m.dashboard.heading(monthLabel(selectedMonth, 'long'))}</h1>
      {loading && <p role="status" className="text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>}
      <MonthStatement
        label={monthLabel(selectedMonth, 'long')}
        current={totals(monthTransactions)}
        previous={previousTotals}
        currency={currency}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <CashflowChart data={series} selectedKey={selectedMonth} currency={currency} className="lg:col-span-2" />
        <CategoryBreakdown transactions={monthTransactions} currency={currency} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <TransactionsPanel
          transactions={monthTransactions}
          categories={categories}
          currency={currency}
          onAdd={addTransaction}
          onRemove={removeTransaction}
          className="lg:col-span-2"
        />
        <BudgetList budgets={monthBudgets} transactions={monthTransactions} currency={currency} />
      </div>
    </main>
  )
}

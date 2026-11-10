'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, monthKey, monthLabel, todayDate, type Transaction, type TransactionType } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { useFinance } from './finance-provider'
import { PageIntro } from './page-intro'
import { Panel } from './panel'

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const weekdayDate = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dayLabel(date: string) {
  return weekdayDate.format(new Date(`${date}T00:00:00.000Z`))
}

function transactionTotal(transactions: Transaction[], type: TransactionType) {
  return transactions.reduce((sum, transaction) => sum + (transaction.type === type ? transaction.amount : 0), 0)
}

export function CalendarPage() {
  const { transactions, currency } = useFinance()
  const [calendarMonth, setCalendarMonth] = useState(() => monthKey(todayDate()))
  const [selectedDate, setSelectedDate] = useState(() => todayDate())
  useEffect(() => {
    setSelectedDate((current) => current.startsWith(calendarMonth) ? current : `${calendarMonth}-01`)
  }, [calendarMonth])
  const [year, month] = calendarMonth.split('-').map(Number)
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(calendarMonth)),
    [transactions, calendarMonth],
  )

  function changeMonth(offset: number) {
    const [currentYear, currentMonth] = calendarMonth.split('-').map(Number)
    const next = new Date(Date.UTC(currentYear, currentMonth - 1 + offset, 1))
    setCalendarMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  const transactionsByDate = useMemo(() => {
    const grouped = new Map<string, Transaction[]>()
    for (const transaction of monthTransactions) {
      const current = grouped.get(transaction.date) ?? []
      current.push(transaction)
      grouped.set(transaction.date, current)
    }
    for (const transactions of grouped.values()) {
      transactions.sort((a, b) => a.time.localeCompare(b.time))
    }
    return grouped
  }, [monthTransactions])

  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const cellCount = Math.ceil((offset + days) / 7) * 7
  const selectedTransactions = transactionsByDate.get(selectedDate) ?? []

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.calendar.eyebrow}
        title={m.pages.calendar.title}
        description={m.pages.calendar.description}
      />
      <Panel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="icon-sm" aria-label="เดือนก่อนหน้า" onClick={() => changeMonth(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <h2 className="text-lg font-semibold">{monthLabel(calendarMonth, 'long')}</h2>
          <Button type="button" variant="outline" size="icon-sm" aria-label="เดือนถัดไป" onClick={() => changeMonth(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-7 border-l border-t border-border">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="border-b border-r border-border bg-secondary px-1 py-2 text-center text-xs text-muted-foreground sm:px-2 sm:text-sm">
              {weekday}
            </div>
          ))}
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - offset + 1
            const date = dayKey(year, month - 1, day)
            const inMonth = day >= 1 && day <= days
            const transactions = inMonth ? transactionsByDate.get(date) ?? [] : []
            const expenses = transactionTotal(transactions, 'expense')
            const incomes = transactionTotal(transactions, 'income')
            const active = date === selectedDate

            return (
              <button
                key={date}
                type="button"
                disabled={!inMonth}
                onClick={() => setSelectedDate(date)}
                aria-pressed={active}
                aria-label={inMonth ? `${dayLabel(date)}, ${transactions.length} รายการ` : undefined}
                className={cn(
                  'flex min-h-20 flex-col items-start gap-1 border-b border-r border-border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2',
                  !inMonth && 'bg-muted/30',
                  inMonth && 'hover:bg-secondary',
                  active && inMonth && 'bg-primary/10 ring-2 ring-inset ring-primary',
                )}
              >
                {inMonth && (
                  <>
                    <span className="text-xs font-medium sm:text-sm">{day}</span>
                    {transactions.length > 0 && (
                      <span className="line-clamp-2 text-left text-[10px] leading-tight text-muted-foreground sm:text-xs">
                        {m.pages.calendar.transactionCount(transactions.length)}
                      </span>
                    )}
                    {expenses > 0 && (
                      <span className="truncate text-[10px] font-medium text-expense sm:text-xs">
                        −{formatCurrency(expenses, currency)}
                      </span>
                    )}
                    {incomes > 0 && (
                      <span className="hidden truncate text-[10px] text-income sm:block sm:text-xs">
                        +{formatCurrency(incomes, currency)}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{dayLabel(selectedDate)}</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-expense">
              {m.pages.calendar.expense}: {formatCurrency(transactionTotal(selectedTransactions, 'expense'), currency)}
            </span>
            <span className="text-income">
              {m.pages.calendar.income}: {formatCurrency(transactionTotal(selectedTransactions, 'income'), currency)}
            </span>
          </div>
        </div>
        {selectedTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.pages.calendar.noTransactions}</p>
        ) : (
          <ul className="divide-y divide-border">
            {selectedTransactions.map((transaction) => (
              <li key={transaction.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <time dateTime={`${transaction.date}T${transaction.time}`} className="w-14 shrink-0 font-mono text-sm text-muted-foreground">
                  {transaction.time}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">{transaction.category}</p>
                </div>
                <span className={cn('font-mono text-sm tabular-nums', transaction.type === 'expense' ? 'text-expense' : 'text-income')}>
                  {transaction.type === 'expense' ? '−' : '+'}{formatCurrency(transaction.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  )
}

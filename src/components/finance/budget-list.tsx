import { type Budget, type CurrencyCode, type Transaction, formatCurrency, spendingByCategory } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'

export function BudgetList({
  budgets,
  transactions,
  currency,
}: {
  budgets: Budget[]
  transactions: Transaction[]
  currency: CurrencyCode
}) {
  const spent = new Map(spendingByCategory(transactions).map((r) => [r.category, r.amount]))
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + (spent.get(b.category) ?? 0), 0)

  return (
    <section aria-labelledby="budgets-heading" className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 id="budgets-heading" className="font-semibold">
          {m.budgetList.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {m.budgetList.usedPrefix}{' '}
          <span className="font-mono tabular-nums text-foreground">{formatCurrency(totalSpent, currency)}</span>{' '}
          {m.budgetList.of} <span className="font-mono tabular-nums">{formatCurrency(totalLimit, currency)}</span>
        </p>
      </div>
      <ul className="flex flex-col gap-5">
        {budgets.map((b) => {
          const used = spent.get(b.category) ?? 0
          const pct = (used / b.limit) * 100
          const over = used > b.limit
          const remaining = b.limit - used
          return (
            <li key={b.category} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{b.category}</span>
                <span className={cn('font-mono text-xs tabular-nums', over ? 'text-expense' : 'text-muted-foreground')}>
                  {over ? m.budgetList.over(formatCurrency(-remaining, currency)) : m.budgetList.left(formatCurrency(remaining, currency))}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label={m.budgetList.progressAria(b.category)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(pct, 100))}
              >
                <div
                  className={cn('h-full rounded-full', over ? 'bg-expense' : pct > 80 ? 'bg-primary' : 'bg-muted-foreground')}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatCurrency(used, currency)} / {formatCurrency(b.limit, currency)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

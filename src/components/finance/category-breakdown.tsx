import { type CurrencyCode, type Transaction, formatCurrency, spendingByCategory } from '@/lib/finance'
import { messages as m } from '@/lib/messages'

export function CategoryBreakdown({ transactions, currency }: { transactions: Transaction[]; currency: CurrencyCode }) {
  const rows = spendingByCategory(transactions)
  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  return (
    <section aria-labelledby="breakdown-heading" className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="breakdown-heading" className="font-semibold">
          {m.breakdown.title}
        </h2>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatCurrency(total, currency)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.breakdown.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const pct = (r.amount / total) * 100
            return (
              <li key={r.category} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{r.category}</span>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {formatCurrency(r.amount, currency)} <span className="text-xs">· {pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

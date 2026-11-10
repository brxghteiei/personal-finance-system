import { formatCurrency, type CurrencyCode } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'

type Totals = { income: number; expense: number; net: number }

type Props = {
  label: string
  current: Totals
  previous: Totals | null
  currency: CurrencyCode
}

function Delta({ value, prev, invert = false }: { value: number; prev?: number; invert?: boolean }) {
  if (prev === undefined || prev === 0) return <span className="text-muted-foreground">{m.statement.noPrior}</span>
  const change = ((value - prev) / Math.abs(prev)) * 100
  const good = invert ? change <= 0 : change >= 0
  return (
    <span className={good ? 'text-income' : 'text-expense'}>
      {m.statement.vsLastMonth(`${change >= 0 ? '+' : ''}${change.toFixed(1)}`)}
    </span>
  )
}

export function MonthStatement({ label, current, previous, currency }: Props) {
  const savingsRate = current.income > 0 ? (current.net / current.income) * 100 : 0
  const spentShare = current.income > 0 ? Math.min((current.expense / current.income) * 100, 100) : 100

  return (
    <section aria-labelledby="statement-heading" className="rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h2 id="statement-heading" className="text-sm text-muted-foreground">
            {m.statement.title(label)}
          </h2>
          <p
            className={cn(
              'font-mono text-5xl font-semibold tracking-tight tabular-nums md:text-6xl',
              current.net >= 0 ? 'text-foreground' : 'text-expense',
            )}
          >
            {current.net >= 0 ? '+' : ''}
            {formatCurrency(current.net, currency)}
          </p>
          <p className="text-sm text-muted-foreground">
            {current.income > 0 ? m.statement.kept(Number(savingsRate.toFixed(0))) : m.statement.noIncome}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-6 sm:gap-10">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{m.statement.moneyIn}</dt>
            <dd className="font-mono text-2xl font-medium text-income tabular-nums">{formatCurrency(current.income, currency)}</dd>
            <dd className="text-xs">
              <Delta value={current.income} prev={previous?.income} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{m.statement.moneyOut}</dt>
            <dd className="font-mono text-2xl font-medium text-expense tabular-nums">{formatCurrency(current.expense, currency)}</dd>
            <dd className="text-xs">
              <Delta value={current.expense} prev={previous?.expense} invert />
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <div
          className="flex h-3 overflow-hidden rounded-full bg-income"
          role="img"
          aria-label={m.statement.spentAria(Number(spentShare.toFixed(0)))}
        >
          <div className="h-full bg-expense" style={{ width: `${spentShare}%` }} />
        </div>
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          <span>{m.statement.spent(Number(spentShare.toFixed(0)))}</span>
          <span>{m.statement.saved(Number(Math.max(100 - spentShare, 0).toFixed(0)))}</span>
        </div>
      </div>
    </section>
  )
}

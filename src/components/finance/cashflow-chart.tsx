'use client'

import { useTheme } from 'next-themes'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMounted } from '@/hooks/use-mounted'
import { formatCompact, formatCurrency, type CurrencyCode } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'

// SVG presentation attributes don't resolve CSS variables, so mirror the theme tokens here.
// `dark` holds the original v0 values; `light` matches the light palette in globals.css.
const PALETTES = {
  dark: {
    income: 'oklch(0.8 0.12 80)',
    expense: 'oklch(0.7 0.14 30)',
    muted: 'oklch(0.7 0.015 200)',
    grid: 'oklch(0.95 0.01 90 / 0.08)',
    cursor: 'oklch(0.26 0.014 200)',
    popover: 'oklch(0.21 0.014 200)',
    text: 'oklch(0.95 0.01 90)',
  },
  light: {
    income: 'oklch(0.55 0.12 75)',
    expense: 'oklch(0.55 0.17 30)',
    muted: 'oklch(0.48 0.02 200)',
    grid: 'oklch(0.2 0.02 200 / 0.1)',
    cursor: 'oklch(0.955 0.006 90)',
    popover: 'oklch(1 0 0)',
    text: 'oklch(0.2 0.02 200)',
  },
} as const

type Point = { key: string; month: string; income: number; expense: number; net: number }

type Props = {
  data: Point[]
  selectedKey: string
  currency: CurrencyCode
  className?: string
}

export function CashflowChart({ data, selectedKey, currency, className }: Props) {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const COLORS = PALETTES[mounted && resolvedTheme === 'light' ? 'light' : 'dark']

  return (
    <section
      aria-labelledby="cashflow-heading"
      className={cn('flex flex-col rounded-xl border border-border bg-card p-6', className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="cashflow-heading" className="font-semibold">
          {m.cashflow.title}
        </h2>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-sm bg-income" /> {m.cashflow.income}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-sm bg-expense" /> {m.cashflow.expense}
          </span>
        </div>
      </div>
      <div className="mt-6 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} margin={{ left: -8, right: 0, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => formatCompact(Number(value), currency)}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: COLORS.cursor }}
              contentStyle={{
                background: COLORS.popover,
                border: `1px solid ${COLORS.grid}`,
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
              }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => formatCurrency(Number(value), currency)}
            />
            <Bar dataKey="income" name={m.cashflow.income} radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.key} fill={COLORS.income} fillOpacity={d.key === selectedKey ? 1 : 0.35} />
              ))}
            </Bar>
            <Bar dataKey="expense" name={m.cashflow.expense} radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.key} fill={COLORS.expense} fillOpacity={d.key === selectedKey ? 1 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

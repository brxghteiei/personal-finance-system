'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatFullDate, type Transaction } from '@/lib/finance'
import { messages as m } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { useFinance } from './finance-provider'
import { PageIntro } from './page-intro'
import { Panel } from './panel'
import { TransactionForm } from './transaction-form'

export function RecentlyDeletedPage() {
  const { deletedTransactions, categories, currency, updateTransaction, restoreTransaction } = useFinance()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const transactions = deletedTransactions

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <PageIntro
        eyebrow={m.pages.recentlyDeleted.eyebrow}
        title={m.pages.recentlyDeleted.title}
        description={m.pages.recentlyDeleted.description}
      />
      {editingTransaction && (
        <TransactionForm
          key={editingTransaction.id}
          categories={categories}
          initialTransaction={editingTransaction}
          onSubmit={async (values) => {
            await updateTransaction({ ...values, id: editingTransaction.id })
            setEditingTransaction(null)
          }}
          onCancel={() => setEditingTransaction(null)}
        />
      )}
      <Panel>
        {transactions.length === 0 ? (
          <p data-tour="deleted-content" className="text-sm text-muted-foreground">{m.pages.recentlyDeleted.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((transaction, index) => (
              <li
                key={transaction.id}
                className="flex flex-wrap items-center gap-3 py-4"
              >
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    transaction.type === 'income' ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense',
                  )}
                >
                  {transaction.type === 'income' ? <ArrowDownLeft aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.category} · {formatFullDate(transaction.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.pages.recentlyDeleted.deletedAt}: {formatFullDate(transaction.deletedAt)}
                  </p>
                </div>
                <p className={cn('font-mono text-sm tabular-nums', transaction.type === 'income' ? 'text-income' : 'text-foreground')}>
                  {transaction.type === 'income' ? '+' : '−'}
                  {formatCurrency(transaction.amount, currency)}
                </p>
                <div data-tour={index === 0 ? 'deleted-content' : undefined} className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.transactionsPanel.editAria(transaction.description)}
                    onClick={() => setEditingTransaction(transaction)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.transactionsPanel.restoreAria(transaction.description)}
                    onClick={() => {
                      void restoreTransaction(transaction.id).catch(() => undefined)
                    }}
                  >
                    <RotateCcw aria-hidden="true" className="text-income" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  )
}

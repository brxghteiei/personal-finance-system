import { NextResponse } from 'next/server'
import { TransactionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth/api'

export async function GET(request: Request) {
  const auth = await requireApiUser(request)
  if (!auth.user) return auth.response
  const transactions = await prisma.transaction.findMany({
    where: { ownerId: auth.user.id, deletedAt: { not: null } },
    include: { category: true },
    orderBy: [{ deletedAt: 'desc' }, { date: 'desc' }],
  })

  return NextResponse.json(
    transactions.map((transaction) => ({
      id: transaction.id,
      description: transaction.title,
      amount: Number(transaction.amount),
      date: transaction.date.toISOString().slice(0, 10),
      time: transaction.time,
      category: transaction.category.name,
      type: transaction.type === TransactionType.INCOME ? 'income' : 'expense',
      deletedAt: transaction.deletedAt?.toISOString() ?? null,
    })),
  )
}

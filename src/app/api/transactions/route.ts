import { NextResponse } from 'next/server'
import { TransactionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { transactionInput } from '@/validators/transaction'
import { requireApiUser } from '@/lib/auth/api'

const transactionType = {
  income: TransactionType.INCOME,
  expense: TransactionType.EXPENSE,
} as const

export async function GET(request: Request) {
  const auth = await requireApiUser(request)
  if (!auth.user) return auth.response
  const transactions = await prisma.transaction.findMany({
    where: { ownerId: auth.user.id, deletedAt: null },
    include: { category: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
    })),
  )
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request, true)
  if (!auth.user) return auth.response
  const input = transactionInput.safeParse(await request.json())
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? 'ข้อมูลรายการไม่ถูกต้อง' }, { status: 400 })
  }

  const { description, amount, date, time, category, type } = input.data
  const saved = await prisma.transaction.create({
    data: {
      title: description,
      amount,
      date: new Date(`${date}T00:00:00.000Z`),
      time,
      type: transactionType[type],
      category: {
        connectOrCreate: {
          where: { ownerId_name_type: { ownerId: auth.user.id, name: category, type: transactionType[type] } },
          create: { name: category, type: transactionType[type], ownerId: auth.user.id },
        },
      },
      owner: { connect: { id: auth.user.id } },
    },
    include: { category: true },
  })

  return NextResponse.json(
    {
      id: saved.id,
      description: saved.title,
      amount: Number(saved.amount),
      date: saved.date.toISOString().slice(0, 10),
      time: saved.time,
      category: saved.category.name,
      type,
    },
    { status: 201 },
  )
}

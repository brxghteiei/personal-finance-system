import { NextResponse } from 'next/server'
import { TransactionType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}-01T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 7) === value
})

const budgetInput = z.object({
  category: z.string().trim().min(1).max(80),
  limit: z.number().finite().positive().max(9999999999.99),
  month: monthSchema,
})

function toBudget(budget: { id: string; budgetAmount: { toString(): string }; month: Date; category: { name: string } }) {
  return {
    id: budget.id,
    category: budget.category.name,
    limit: Number(budget.budgetAmount),
    month: budget.month.toISOString().slice(0, 7),
  }
}

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get('month')
  const parsedMonth = month === null ? null : monthSchema.safeParse(month)
  if (parsedMonth && !parsedMonth.success) {
    return NextResponse.json({ error: 'เดือนไม่ถูกต้อง' }, { status: 400 })
  }

  const budgets = await prisma.budget.findMany({
    where: parsedMonth?.success ? { month: new Date(`${parsedMonth.data}-01T00:00:00.000Z`) } : undefined,
    include: { category: true },
    orderBy: { category: { name: 'asc' } },
  })

  return NextResponse.json(budgets.map(toBudget))
}

export async function POST(request: Request) {
  const parsed = budgetInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลงบประมาณไม่ถูกต้อง' }, { status: 400 })
  }

  const { category, limit, month } = parsed.data
  const categoryRecord = await prisma.category.upsert({
    where: { name_type: { name: category, type: TransactionType.EXPENSE } },
    update: {},
    create: { name: category, type: TransactionType.EXPENSE },
  })
  const budget = await prisma.budget.upsert({
    where: {
      categoryId_month: {
        categoryId: categoryRecord.id,
        month: new Date(`${month}-01T00:00:00.000Z`),
      },
    },
    update: { budgetAmount: limit },
    create: {
      categoryId: categoryRecord.id,
      month: new Date(`${month}-01T00:00:00.000Z`),
      budgetAmount: limit,
    },
    include: { category: true },
  })

  return NextResponse.json(toBudget(budget), { status: 201 })
}

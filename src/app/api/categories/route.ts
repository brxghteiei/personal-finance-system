import { NextResponse } from 'next/server'
import { TransactionType } from '@prisma/client'
import { z } from 'zod'
import { CATEGORIES, type TransactionType as FinanceTransactionType } from '@/lib/finance'
import { prisma } from '@/lib/prisma'

const categoryInput = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['income', 'expense']),
})

const categoryUpdateInput = z.object({
  currentName: z.string().trim().min(1).max(80),
  currentType: z.enum(['income', 'expense']),
  name: z.string().trim().min(1).max(80),
})

const categoryKeyInput = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['income', 'expense']),
})

const transactionType = {
  income: TransactionType.INCOME,
  expense: TransactionType.EXPENSE,
} as const
const builtInCategories: Record<FinanceTransactionType, readonly string[]> = CATEGORIES

export async function GET() {
  const saved = await prisma.category.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  const categories: Record<FinanceTransactionType, string[]> = {
    income: [...CATEGORIES.income],
    expense: [...CATEGORIES.expense],
  }
  const archived = {
    income: new Set<string>(),
    expense: new Set<string>(),
  }

  for (const category of saved) {
    const type = category.type === TransactionType.INCOME ? 'income' : 'expense'
    if (!category.isActive) {
      archived[type].add(category.name)
    } else if (!categories[type].includes(category.name)) {
      categories[type].push(category.name)
    }
  }

  for (const type of ['income', 'expense'] as const) {
    categories[type] = categories[type].filter((name) => !archived[type].has(name))
  }

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const parsed = categoryInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลหมวดหมู่ไม่ถูกต้อง' }, { status: 400 })
  }

  const { name, type } = parsed.data
  const existing = await prisma.category.findUnique({
    where: { name_type: { name, type: transactionType[type] } },
  })
  if (existing?.isActive || (!existing && builtInCategories[type].includes(name))) {
    return NextResponse.json({ error: 'มีหมวดหมู่นี้อยู่แล้ว' }, { status: 409 })
  }

  const category = existing
    ? await prisma.category.update({
        where: { id: existing.id },
        data: { isActive: true },
      })
    : await prisma.category.create({
        data: { name, type: transactionType[type] },
      })

  return NextResponse.json({ name: category.name, type }, { status: 201 })
}

export async function PATCH(request: Request) {
  const parsed = categoryUpdateInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลหมวดหมู่ไม่ถูกต้อง' }, { status: 400 })
  }

  const { currentName, currentType, name } = parsed.data
  const type = transactionType[currentType]
  if (currentName === name) {
    return NextResponse.json({ name, type: currentType })
  }

  if (builtInCategories[currentType].includes(name)) {
    return NextResponse.json({ error: 'มีหมวดหมู่นี้อยู่แล้ว' }, { status: 409 })
  }

  const current = await prisma.category.findUnique({
    where: { name_type: { name: currentName, type } },
  })
  const duplicate = await prisma.category.findUnique({
    where: { name_type: { name, type } },
  })
  if (duplicate) return NextResponse.json({ error: 'มีหมวดหมู่นี้อยู่แล้ว' }, { status: 409 })

  if (current) {
    const updated = await prisma.category.update({
      where: { id: current.id },
      data: { name, isActive: true },
    })
    return NextResponse.json({ name: updated.name, type: currentType })
  }

  await prisma.$transaction([
    prisma.category.upsert({
      where: { name_type: { name: currentName, type } },
      update: { isActive: false },
      create: { name: currentName, type, isActive: false },
    }),
    prisma.category.create({ data: { name, type, isActive: true } }),
  ])
  return NextResponse.json({ name, type: currentType })
}

export async function DELETE(request: Request) {
  const parsed = categoryKeyInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลหมวดหมู่ไม่ถูกต้อง' }, { status: 400 })
  }

  const { name, type } = parsed.data
  const categoryType = transactionType[type]
  const category = await prisma.category.findUnique({
    where: { name_type: { name, type: categoryType } },
  })

  if (category) {
    await prisma.category.update({
      where: { id: category.id },
      data: { isActive: false },
    })
  } else {
    await prisma.category.create({
      data: { name, type: categoryType, isActive: false },
    })
  }

  return NextResponse.json({ success: true })
}

import { NextResponse } from 'next/server'
import { Prisma, TransactionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { transactionInput } from '@/validators/transaction'

const transactionType = {
  income: TransactionType.INCOME,
  expense: TransactionType.EXPENSE,
} as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = transactionInput.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ข้อมูลรายการไม่ถูกต้อง' }, { status: 400 })
  }

  const { description, amount, date, time, category, type } = parsed.data
  try {
    const saved = await prisma.transaction.update({
      where: { id },
      data: {
        title: description,
        amount,
        date: new Date(`${date}T00:00:00.000Z`),
        time,
        type: transactionType[type],
        category: {
          connectOrCreate: {
            where: { name_type: { name: category, type: transactionType[type] } },
            create: { name: category, type: transactionType[type] },
          },
        },
      },
      include: { category: true },
    })

    return NextResponse.json({
      id: saved.id,
      description: saved.title,
      amount: Number(saved.amount),
      date: saved.date.toISOString().slice(0, 10),
      time: saved.time,
      category: saved.category.name,
      type,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'ไม่พบรายการที่ต้องการแก้ไข' }, { status: 404 })
    }
    throw error
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deletedAt = new Date()
  try {
    const deleted = await prisma.transaction.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการที่ต้องการลบ' }, { status: 404 })
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'ไม่พบรายการที่ต้องการลบ' }, { status: 404 })
    }
    throw error
  }
  return NextResponse.json({ success: true, deletedAt: deletedAt.toISOString() })
}

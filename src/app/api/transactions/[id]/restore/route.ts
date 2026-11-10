import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const restored = await prisma.transaction.updateMany({
    where: { id, deletedAt: { not: null } },
    data: { deletedAt: null },
  })

  if (restored.count === 0) {
    return NextResponse.json({ error: 'ไม่พบรายการที่ถูกลบนี้' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

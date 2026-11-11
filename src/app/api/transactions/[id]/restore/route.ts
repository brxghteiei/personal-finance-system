import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth/api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request, true)
  if (!auth.user) return auth.response
  const { id } = await params
  const restored = await prisma.transaction.updateMany({
    where: { id, ownerId: auth.user.id, deletedAt: { not: null } },
    data: { deletedAt: null },
  })

  if (restored.count === 0) {
    return NextResponse.json({ error: 'ไม่พบรายการที่ถูกลบนี้' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

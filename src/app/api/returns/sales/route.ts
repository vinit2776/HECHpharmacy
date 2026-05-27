import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES } from '@/lib/auth-utils'
import { generateSalesReturnNumber } from '@/lib/billing-numbers'

export async function GET(req: Request) {
  try {
    const session = await requireRole(COUNTER_ROLES)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const returns = await prisma.salesReturn.findMany({
      where,
      include: {
        originalBill: { include: { patient: true } },
        initiatedByUser: { select: { name: true } },
        approvedByUser: { select: { name: true } },
        items: { include: { drug: true, batch: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(returns)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(COUNTER_ROLES)
    const body = await req.json()
    const { originalBillId, returnReason, items, notes } = body

    const returnNumber = await generateSalesReturnNumber()
    const totalRefundAmount = items.reduce(
      (sum: number, item: any) => sum + Number(item.refundAmount),
      0
    )

    const salesReturn = await prisma.salesReturn.create({
      data: {
        returnNumber,
        originalBillId,
        returnDate: new Date(),
        returnReason,
        initiatedBy: session.user.id,
        status: 'pending_approval',
        totalRefundAmount,
        notes: notes ?? null,
        items: {
          create: items.map((item: any) => ({
            billItemId: item.billItemId,
            drugId: item.drugId,
            batchId: item.batchId,
            quantityReturned: item.quantityReturned,
            refundAmount: item.refundAmount,
            returnToStock: item.returnToStock ?? true,
          })),
        },
      },
      include: {
        originalBill: { include: { patient: true } },
        initiatedByUser: { select: { name: true } },
        items: { include: { drug: true, batch: true } },
      },
    })

    return NextResponse.json(salesReturn, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

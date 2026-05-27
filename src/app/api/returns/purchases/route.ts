import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES } from '@/lib/auth-utils'
import { generatePurchaseReturnNumber } from '@/lib/billing-numbers'

export async function GET(req: Request) {
  try {
    const session = await requireRole(PURCHASE_ROLES)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const returns = await prisma.purchaseReturn.findMany({
      where,
      include: {
        originalGrn: { include: { supplier: true } },
        supplier: true,
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
    const session = await requireRole(PURCHASE_ROLES)
    const body = await req.json()
    const { originalGrnId, supplierId, returnReason, items, notes } = body

    const returnNumber = await generatePurchaseReturnNumber()
    const totalReturnAmount = items.reduce(
      (sum: number, item: any) => sum + Number(item.returnValue),
      0
    )

    const purchaseReturn = await prisma.purchaseReturn.create({
      data: {
        returnNumber,
        originalGrnId,
        supplierId,
        returnDate: new Date(),
        returnReason,
        initiatedBy: session.user.id,
        status: 'pending_approval',
        totalReturnAmount,
        notes: notes ?? null,
        items: {
          create: items.map((item: any) => ({
            drugId: item.drugId,
            batchId: item.batchId,
            quantityReturned: item.quantityReturned,
            returnValue: item.returnValue,
          })),
        },
      },
      include: {
        originalGrn: { include: { supplier: true } },
        supplier: true,
        initiatedByUser: { select: { name: true } },
        items: { include: { drug: true, batch: true } },
      },
    })

    return NextResponse.json(purchaseReturn, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

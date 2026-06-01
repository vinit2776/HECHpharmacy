import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES, apiError } from '@/lib/auth-utils'
import { generatePurchaseReturnNumberInTx, withNumberRetry } from '@/lib/billing-numbers'

export async function GET(req: Request) {
  try {
    await requireRole(PURCHASE_ROLES)
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
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(PURCHASE_ROLES)
    const body = await req.json()
    const { originalGrnId, supplierId, returnReason, items, notes } = body

    if (!originalGrnId || !supplierId || !returnReason || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'originalGrnId, supplierId, returnReason, and at least one item are required' },
        { status: 422 }
      )
    }

    const totalReturnAmount = items.reduce(
      (sum: number, item: any) => sum + Number(item.returnValue),
      0
    )

    const purchaseReturn = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const returnNumber = await generatePurchaseReturnNumberInTx(tx)
        return tx.purchaseReturn.create({
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
      })
    )

    return NextResponse.json(purchaseReturn, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

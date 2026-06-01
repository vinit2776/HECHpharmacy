import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES, apiError } from '@/lib/auth-utils'
import { generateSalesReturnNumberInTx, withNumberRetry } from '@/lib/billing-numbers'

export async function GET(req: Request) {
  try {
    await requireRole(COUNTER_ROLES)
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
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(COUNTER_ROLES)
    const body = await req.json()
    const { originalBillId, returnReason, items, notes } = body

    if (!originalBillId || !returnReason || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'originalBillId, returnReason, and at least one item are required' },
        { status: 422 }
      )
    }

    // Validate the original bill exists and is active
    const originalBill = await prisma.salesBill.findUnique({
      where: { id: originalBillId },
      include: { items: true },
    })
    if (!originalBill) {
      return NextResponse.json({ error: 'Original bill not found' }, { status: 404 })
    }
    if (originalBill.status !== 'active') {
      return NextResponse.json({ error: 'Returns can only be created for active bills' }, { status: 422 })
    }

    // Build index of original bill items by their id
    const billItemMap = new Map(originalBill.items.map((bi) => [bi.id, bi]))

    // Validate each return item against the original bill
    for (const item of items) {
      if (!item.billItemId || !item.drugId || !item.batchId) {
        return NextResponse.json(
          { error: 'Each return item must have billItemId, drugId, and batchId' },
          { status: 422 }
        )
      }
      const originalItem = billItemMap.get(item.billItemId)
      if (!originalItem) {
        return NextResponse.json(
          { error: `Bill item ${item.billItemId} does not belong to bill ${originalBillId}` },
          { status: 422 }
        )
      }
      if (originalItem.batchId !== item.batchId || originalItem.drugId !== item.drugId) {
        return NextResponse.json(
          { error: `Batch/drug mismatch for bill item ${item.billItemId}` },
          { status: 422 }
        )
      }
      const qty = Number(item.quantityReturned)
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json(
          { error: `quantityReturned must be a positive integer` },
          { status: 422 }
        )
      }
      if (qty > originalItem.quantity) {
        return NextResponse.json(
          { error: `Cannot return more than original quantity (${originalItem.quantity}) for item ${item.billItemId}` },
          { status: 422 }
        )
      }
      const refund = Number(item.refundAmount)
      if (isNaN(refund) || refund < 0) {
        return NextResponse.json({ error: 'refundAmount must be a non-negative number' }, { status: 422 })
      }
    }

    const totalRefundAmount = items.reduce((sum: number, item: any) => sum + Number(item.refundAmount), 0)

    const salesReturn = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const returnNumber = await generateSalesReturnNumberInTx(tx)
        return tx.salesReturn.create({
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
      })
    )

    return NextResponse.json(salesReturn, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

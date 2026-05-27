import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES } from '@/lib/auth-utils'
import { startOfDay, endOfDay, addDays } from 'date-fns'

export async function GET(req: Request) {
  try {
    await requireRole(MANAGER_ROLES)

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const nearExpiryThreshold = addDays(now, 30)

    const [
      billsToday,
      pendingSalesReturns,
      pendingPurchaseReturns,
      lowStockBatches,
      nearExpiryBatches,
      h1SugamPending,
      paymentModeCounts,
    ] = await Promise.all([
      // Bills created today with status=active
      prisma.salesBill.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'active',
        },
        select: {
          netAmount: true,
          totalDiscountAmount: true,
          paymentMode: true,
        },
      }),

      // Pending sales returns count
      prisma.salesReturn.count({
        where: { status: 'pending_approval' },
      }),

      // Pending purchase returns count
      prisma.purchaseReturn.count({
        where: { status: 'pending_approval' },
      }),

      // Low stock: batches where quantityAvailable <= drug.reorderLevel
      prisma.inventoryBatch.findMany({
        where: {
          isQuarantined: false,
        },
        select: {
          quantityAvailable: true,
          drug: {
            select: { id: true, reorderLevel: true },
          },
        },
      }),

      // Near expiry batches (expiry within 30 days, not already expired)
      prisma.inventoryBatch.count({
        where: {
          expiryDate: { gt: now, lte: nearExpiryThreshold },
          isQuarantined: false,
          quantityAvailable: { gt: 0 },
        },
      }),

      // H1 Sugam pending entries
      prisma.registerForm18.count({
        where: {
          isH1: true,
          sugamUploadStatus: 'pending',
        },
      }),

      // Payment mode aggregation for today's active bills
      prisma.salesBill.groupBy({
        by: ['paymentMode'],
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'active',
        },
        _sum: { netAmount: true },
        _count: { id: true },
      }),
    ])

    // Compute today's stats from bills
    let netCollectedToday = 0
    let discountGivenToday = 0

    for (const bill of billsToday) {
      netCollectedToday += Number(bill.netAmount)
      discountGivenToday += Number(bill.totalDiscountAmount)
    }

    // Compute collections by payment mode
    const collectionsByPaymentMode: Record<string, { count: number; total: number }> = {}
    for (const group of paymentModeCounts) {
      collectionsByPaymentMode[group.paymentMode] = {
        count: group._count.id,
        total: Number(group._sum.netAmount ?? 0),
      }
    }

    // Compute low stock drug count (unique drugs with at least one low stock batch)
    const lowStockDrugIds = new Set<string>()
    for (const batch of lowStockBatches) {
      if (batch.quantityAvailable <= batch.drug.reorderLevel) {
        lowStockDrugIds.add(batch.drug.id)
      }
    }

    return NextResponse.json({
      billsCountToday: billsToday.length,
      netCollectedToday,
      discountGivenToday,
      collectionsByPaymentMode,
      pendingSalesReturnsCount: pendingSalesReturns,
      pendingPurchaseReturnsCount: pendingPurchaseReturns,
      lowStockDrugCount: lowStockDrugIds.size,
      nearExpiryBatchesCount: nearExpiryBatches,
      h1SugamPendingCount: h1SugamPending,
    })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

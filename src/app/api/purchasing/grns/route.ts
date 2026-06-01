import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES, apiError } from '@/lib/auth-utils'
import { generateGrnNumberInTx, withNumberRetry } from '@/lib/billing-numbers'

export async function GET(req: Request) {
  try {
    const session = await requireRole(PURCHASE_ROLES)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')
    const search = searchParams.get('search') ?? ''

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (search) {
      where.OR = [
        { grnNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const grns = await prisma.purchaseGrn.findMany({
      where,
      include: {
        supplier: true,
        receivedByUser: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(grns)
  } catch (e: any) {
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(PURCHASE_ROLES)

    const body = await req.json()
    const {
      supplierId,
      supplierInvoiceNo,
      supplierInvoiceDate,
      receivedDate,
      items = [],
      notes,
    } = body

    let totalAmount = 0
    let totalGstAmount = 0
    let totalDiscountAmount = 0

    for (const item of items) {
      totalAmount += item.lineTotal ?? 0
      totalGstAmount += item.gstAmount ?? 0
      // Discount amount = MRP line - purchase line, not re-derived from rate × pct
      totalDiscountAmount += Math.max(0, (item.mrpPerUnit ?? 0) * (item.quantity ?? 0) - (item.lineTotal ?? 0))
    }

    // lineTotal already includes GST (rate + gst), so netPayable = sum of lineTotals only.
    // Adding totalGstAmount again would double-count GST.
    const netPayable = totalAmount

    const grn = await withNumberRetry(() => prisma.$transaction(async (tx) => {
      const grnNumber = await generateGrnNumberInTx(tx)
      const created = await tx.purchaseGrn.create({
        data: {
          grnNumber,
          supplierId,
          supplierInvoiceNo,
          supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : new Date(),
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          receivedBy: session.user.id,
          status: 'draft',
          totalAmount,
          totalGstAmount,
          totalDiscountAmount,
          netPayable,
          notes,
        },
      })

      for (const item of items) {
        await tx.purchaseGrnItem.create({
          data: {
            grnId: created.id,
            drugId: item.drugId,
            batchNo: item.batchNo,
            manufacturedDate: item.manufacturedDate ? new Date(item.manufacturedDate) : null,
            expiryDate: new Date(item.expiryDate),
            quantity: item.quantity,
            freeQuantity: item.freeQuantity ?? 0,
            purchaseRatePerUnit: item.purchaseRatePerUnit,
            mrpPerUnit: item.mrpPerUnit,
            tradeDiscountPct: item.tradeDiscountPct ?? 0,
            gstRate: item.gstRate ?? 0,
            gstAmount: item.gstAmount ?? 0,
            lineTotal: item.lineTotal ?? 0,
            notes: item.notes,
          },
        })
      }

      return tx.purchaseGrn.findUnique({
        where: { id: created.id },
        include: {
          supplier: true,
          receivedByUser: { select: { name: true } },
          items: true,
        },
      })
    }))

    return NextResponse.json(grn, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

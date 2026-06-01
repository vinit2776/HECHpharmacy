import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES } from '@/lib/auth-utils'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(PURCHASE_ROLES)

    const grn = await prisma.purchaseGrn.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        receivedByUser: { select: { name: true } },
        items: { include: { drug: true } },
        inventoryBatches: true,
        purchaseReturns: true,
        form17Entries: true,
      },
    })

    if (!grn) {
      return NextResponse.json({ error: 'GRN not found' }, { status: 404 })
    }

    return NextResponse.json(grn)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(PURCHASE_ROLES)

    const existing = await prisma.purchaseGrn.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'GRN not found' }, { status: 404 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft GRNs can be updated' }, { status: 422 })
    }

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
      totalDiscountAmount += (item.tradeDiscountPct ?? 0) > 0
        ? (item.purchaseRatePerUnit ?? 0) * (item.quantity ?? 0) * (item.tradeDiscountPct / 100)
        : 0
    }

    // lineTotal already includes GST — don't add gstAmount again
    const netPayable = totalAmount

    const grn = await prisma.$transaction(async (tx) => {
      await tx.purchaseGrnItem.deleteMany({ where: { grnId: params.id } })

      for (const item of items) {
        await tx.purchaseGrnItem.create({
          data: {
            grnId: params.id,
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

      return tx.purchaseGrn.update({
        where: { id: params.id },
        data: {
          supplierId,
          supplierInvoiceNo,
          supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : undefined,
          receivedDate: receivedDate ? new Date(receivedDate) : undefined,
          notes,
          totalAmount,
          totalGstAmount,
          totalDiscountAmount,
          netPayable,
        },
        include: {
          supplier: true,
          receivedByUser: { select: { name: true } },
          items: { include: { drug: true } },
        },
      })
    })

    return NextResponse.json(grn)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

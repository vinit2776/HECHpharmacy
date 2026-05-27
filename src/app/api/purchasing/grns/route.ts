import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES } from '@/lib/auth-utils'
import { generateGrnNumber } from '@/lib/billing-numbers'

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
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
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

    const grnNumber = await generateGrnNumber()

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

    const netPayable = totalAmount + totalGstAmount

    const grn = await prisma.$transaction(async (tx) => {
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
    })

    return NextResponse.json(grn, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

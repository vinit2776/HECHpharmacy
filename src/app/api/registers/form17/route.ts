import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, apiError} from '@/lib/auth-utils'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

export async function GET(req: Request) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = {}
    if (from || to) {
      where.entryDate = {}
      if (from) where.entryDate.gte = startOfDay(parseISO(from))
      if (to) where.entryDate.lte = endOfDay(parseISO(to))
    }

    const entries = await prisma.registerForm17.findMany({
      where,
      include: {
        drug: true,
        grn: { include: { supplier: true, items: true } },
      },
      orderBy: { entryDate: 'asc' },
    })

    const rows = entries.map((e, idx) => {
      const grnItem = e.grn.items.find(
        (i) => i.drugId === e.drugId && i.batchNo === e.batchNo
      )
      return {
        id: e.id,
        serialNo: idx + 1,
        date: e.entryDate.toISOString(),
        supplierName: e.supplierName,
        invoiceNo: e.supplierInvoiceNo,
        drugName: e.drugName,
        batchNo: e.batchNo,
        expiryDate: e.expiryDate.toISOString(),
        quantity: e.quantityReceived,
        mrpPerUnit: Number(e.mrp),
        purchaseRate: Number(e.purchaseRate),
        gstAmount: grnItem ? Number(grnItem.gstAmount) : 0,
        lineTotal: grnItem
          ? Number(grnItem.lineTotal)
          : Number(e.purchaseRate) * e.quantityReceived,
      }
    })

    return NextResponse.json(rows)
  } catch (e: any) {
    return apiError(e)
  }
}

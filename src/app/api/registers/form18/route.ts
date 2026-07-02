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
    const isH1Param = searchParams.get('isH1')

    const where: any = {}
    if (from || to) {
      where.entryDate = {}
      if (from) where.entryDate.gte = startOfDay(parseISO(from))
      if (to) where.entryDate.lte = endOfDay(parseISO(to))
    }
    if (isH1Param === 'true') {
      where.isH1 = true
    }

    const entries = await prisma.registerForm18.findMany({
      where,
      include: {
        drug: true,
        bill: { include: { patient: true, items: true } },
      },
      orderBy: { entryDate: 'asc' },
    })

    const rows = entries.map((e, idx) => {
      const billItem = e.bill.items.find(
        (i) => i.drugId === e.drugId && i.batchNo === e.batchNo
      )
      return {
        id: e.id,
        serialNo: idx + 1,
        date: e.entryDate.toISOString(),
        patientName: e.patientName,
        billNo: e.bill.billNumber,
        drugName: e.drugName,
        schedule: e.schedule,
        batchNo: e.batchNo,
        expiryDate: billItem ? billItem.expiryDate.toISOString() : new Date().toISOString(),
        quantity: e.quantitySold,
        mrpPerUnit: billItem ? Number(billItem.mrpPerUnit) : 0,
        discountedRate: billItem && e.quantitySold > 0
          ? Number(billItem.taxableAmount) / e.quantitySold
          : 0,
        netAmount: billItem ? Number(billItem.lineNetAmount) : 0,
      }
    })

    return NextResponse.json(rows)
  } catch (e: any) {
    return apiError(e)
  }
}

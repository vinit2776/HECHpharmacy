import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, apiError} from '@/lib/auth-utils'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns'

export async function GET(req: Request) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // expects YYYY-MM
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = { isH1: true }
    if (month) {
      const monthDate = parseISO(`${month}-01`)
      where.entryDate = {
        gte: startOfMonth(monthDate),
        lte: endOfMonth(monthDate),
      }
    } else if (from || to) {
      where.entryDate = {}
      if (from) where.entryDate.gte = startOfDay(parseISO(from))
      if (to) where.entryDate.lte = endOfDay(parseISO(to))
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

export async function POST(req: Request) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const body = await req.json()
    const { ids, status } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }

    if (status !== 'uploaded' && status !== 'failed') {
      return NextResponse.json({ error: 'status must be "uploaded" or "failed"' }, { status: 400 })
    }

    const result = await prisma.registerForm18.updateMany({
      where: { id: { in: ids } },
      data: { sugamUploadStatus: status },
    })

    return NextResponse.json({ updated: result.count })
  } catch (e: any) {
    return apiError(e)
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES } from '@/lib/auth-utils'
import { calculateLine } from '@/lib/discount/engine'

export async function POST(req: Request) {
  try {
    await requireRole(COUNTER_ROLES)

    const body = await req.json()
    const { prescriptionSource, patientCategory, drugId, batchId, quantity } = body

    if (!drugId || !batchId || !quantity) {
      return NextResponse.json({ error: 'drugId, batchId, and quantity are required' }, { status: 422 })
    }

    const drug = await prisma.drug.findUnique({
      where: { id: drugId },
      include: { discountConfig: true },
    })

    if (!drug) {
      return NextResponse.json({ error: 'Drug not found' }, { status: 404 })
    }

    const batch = await prisma.inventoryBatch.findUnique({
      where: { id: batchId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const config = drug.discountConfig

    const lineCalc = calculateLine({
      prescriptionSource,
      patientCategory,
      discountApplicable: config?.discountApplicable ?? false,
      bplDiscountPct: config ? Number(config.bplDiscountPct) : 0,
      generalDiscountPct: config ? Number(config.generalDiscountPct) : 0,
      mrpPerUnit: Number(batch.mrpPerUnit),
      quantity,
      gstRate: Number(drug.gstRate),
    })

    return NextResponse.json({
      ...lineCalc,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
      hsnCode: drug.hsnCode,
      drugName: drug.name,
    })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

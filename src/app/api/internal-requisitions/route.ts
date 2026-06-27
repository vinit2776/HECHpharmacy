import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, apiError } from '@/lib/auth-utils'
import { createRequisition } from '@/lib/db/internal-requisition'
import { withNumberRetry } from '@/lib/billing-numbers'
import { addDays } from 'date-fns'

export async function GET(req: Request) {
  try {
    await requireRole(ALL_ROLES)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const date = searchParams.get('date')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (department && department !== 'all') where.department = department
    if (date) {
      const day = new Date(date)
      where.requisitionDate = { gte: day, lt: addDays(day, 1) }
    }

    const requisitions = await prisma.internalRequisition.findMany({
      where,
      include: {
        requestedByUser: { select: { name: true } },
        approvedByUser: { select: { name: true } },
        doctor: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      requisitions.map((r) => ({
        ...r,
        totalCost: Number(r.totalCost),
      }))
    )
  } catch (e: any) {
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(ALL_ROLES)
    const body = await req.json()

    const { department, purpose, doctorId, notes, items = [] } = body

    if (!department || !purpose) {
      return NextResponse.json({ error: 'department and purpose are required' }, { status: 422 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 422 })
    }

    for (const item of items) {
      if (!item.drugId || !item.batchId || !item.quantityIssued || item.quantityIssued <= 0) {
        return NextResponse.json({ error: 'Each item requires drugId, batchId, and a positive quantity' }, { status: 422 })
      }
    }

    // Re-read unitCost from DB — never trust the client
    const batchIds: string[] = items.map((i: any) => i.batchId)
    const batches = await prisma.inventoryBatch.findMany({
      where: { id: { in: batchIds } },
      include: { drug: { select: { name: true, hsnCode: true, schedule: true } } },
    })
    const batchMap = new Map(batches.map((b) => [b.id, b]))

    const enrichedItems = items.map((item: any) => {
      const batch = batchMap.get(item.batchId)
      if (!batch) throw new Error(`Batch ${item.batchId} not found`)
      return {
        drugId: item.drugId,
        batchId: item.batchId,
        drugName: batch.drug.name,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        hsnCode: batch.drug.hsnCode,
        schedule: batch.drug.schedule,
        quantityIssued: item.quantityIssued,
        unitCost: Number(batch.purchaseRatePerUnit),
      }
    })

    const ir = await withNumberRetry(() =>
      createRequisition({
        requisitionDate: new Date(),
        department,
        purpose,
        doctorId: doctorId || undefined,
        notes: notes || undefined,
        requestedBy: session.user.id,
        items: enrichedItems,
      })
    )

    return NextResponse.json(ir, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

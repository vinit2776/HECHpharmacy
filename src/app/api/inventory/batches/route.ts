import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { z } from 'zod'

const quarantineSchema = z.object({
  batchId: z.string().min(1),
  isQuarantined: z.boolean(),
  quarantineReason: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    await requireRole(ALL_ROLES)

    const { searchParams } = new URL(req.url)
    const drugId = searchParams.get('drugId')
    const available = searchParams.get('available') === 'true'

    if (!drugId) {
      return NextResponse.json({ error: 'drugId query parameter is required' }, { status: 400 })
    }

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        drugId,
        ...(available ? { isQuarantined: false, quantityAvailable: { gt: 0 } } : {}),
      },
      include: {
        drug: { select: { id: true, name: true, brandName: true, schedule: true, reorderLevel: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    })

    // Normalise Decimal fields and add aliases for billing page + drug detail page
    const mapped = batches.map((b) => ({
      ...b,
      mrpPerUnit: Number(b.mrpPerUnit),
      purchaseRatePerUnit: Number(b.purchaseRatePerUnit),
      availableQty: b.quantityAvailable,
      batchNumber: b.batchNo,
      receivedAt: b.createdAt,
      mrp: Number(b.mrpPerUnit),
    }))

    return NextResponse.json(mapped)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = quarantineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const { batchId, isQuarantined, quarantineReason } = parsed.data

    const existing = await prisma.inventoryBatch.findUnique({ where: { id: batchId } })
    if (!existing) {
      return NextResponse.json({ error: 'Inventory batch not found' }, { status: 404 })
    }

    const updated = await prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        isQuarantined,
        quarantineReason: isQuarantined ? (quarantineReason ?? null) : null,
      },
      include: {
        drug: { select: { id: true, name: true, brandName: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

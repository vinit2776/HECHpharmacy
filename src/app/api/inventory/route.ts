import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES } from '@/lib/auth-utils'

export async function GET(req: Request) {
  try {
    await requireRole(ALL_ROLES)

    // Fetch all non-quarantined batches grouped by drug
    const batches = await prisma.inventoryBatch.findMany({
      include: {
        drug: {
          include: {
            discountConfig: true,
          },
        },
      },
      orderBy: [{ drug: { name: 'asc' } }, { expiryDate: 'asc' }],
    })

    // Group by drug
    const drugMap = new Map<string, {
      drug: any
      totalStock: number
      batchCount: number
      batches: any[]
    }>()

    for (const batch of batches) {
      const { drug, ...batchData } = batch
      if (!drugMap.has(drug.id)) {
        drugMap.set(drug.id, {
          drug,
          totalStock: 0,
          batchCount: 0,
          batches: [],
        })
      }
      const entry = drugMap.get(drug.id)!
      entry.totalStock += batch.quantityAvailable
      entry.batchCount += 1
      entry.batches.push(batchData)
    }

    const result = Array.from(drugMap.values())

    return NextResponse.json(result)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

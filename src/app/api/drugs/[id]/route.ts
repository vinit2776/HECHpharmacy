import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, SUPER_ADMIN_ROLES } from '@/lib/auth-utils'
import { drugSchema } from '@/lib/validations/drug'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(ALL_ROLES)

    const drug = await prisma.drug.findUnique({
      where: { id: params.id },
      include: {
        discountConfig: true,
        _count: {
          select: { inventoryBatches: true },
        },
      },
    })

    if (!drug) {
      return NextResponse.json({ error: 'Drug not found' }, { status: 404 })
    }

    return NextResponse.json(drug)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(SUPER_ADMIN_ROLES)

    const body = await req.json()
    const parsed = drugSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const existing = await prisma.drug.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Drug not found' }, { status: 404 })
    }

    const data = parsed.data
    const updated = await prisma.drug.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.brandName !== undefined && { brandName: data.brandName }),
        ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.dosageForm !== undefined && { dosageForm: data.dosageForm }),
        ...(data.strength !== undefined && { strength: data.strength }),
        ...(data.packSize !== undefined && { packSize: data.packSize }),
        ...(data.packUnit !== undefined && { packUnit: data.packUnit }),
        ...(data.schedule !== undefined && { schedule: data.schedule }),
        ...(data.hsnCode !== undefined && { hsnCode: data.hsnCode }),
        ...(data.gstRate !== undefined && { gstRate: data.gstRate }),
        ...(data.coldChainRequired !== undefined && { coldChainRequired: data.coldChainRequired }),
        ...(data.coldChainMinTemp !== undefined && { coldChainMinTemp: data.coldChainMinTemp }),
        ...(data.coldChainMaxTemp !== undefined && { coldChainMaxTemp: data.coldChainMaxTemp }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { discountConfig: true },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

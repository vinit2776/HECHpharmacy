import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { drugSchema } from '@/lib/validations/drug'

export async function GET(req: Request) {
  try {
    await requireRole(ALL_ROLES)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const schedule = searchParams.get('schedule')
    const isActiveParam = searchParams.get('isActive')

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (schedule) {
      where.schedule = schedule
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    const drugs = await prisma.drug.findMany({
      where,
      include: {
        discountConfig: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(drugs)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = drugSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const data = parsed.data

    const drug = await prisma.$transaction(async (tx) => {
      const created = await tx.drug.create({
        data: {
          name: data.name,
          brandName: data.brandName,
          manufacturer: data.manufacturer,
          category: data.category,
          dosageForm: data.dosageForm,
          strength: data.strength,
          packSize: data.packSize,
          packUnit: data.packUnit,
          schedule: data.schedule,
          hsnCode: data.hsnCode,
          gstRate: data.gstRate,
          coldChainRequired: data.coldChainRequired,
          coldChainMinTemp: data.coldChainMinTemp,
          coldChainMaxTemp: data.coldChainMaxTemp,
          reorderLevel: data.reorderLevel,
          barcode: data.barcode,
          notes: data.notes,
        },
      })

      await tx.drugDiscountConfig.create({
        data: {
          drugId: created.id,
          discountApplicable: false,
          bplDiscountPct: 0,
          generalDiscountPct: 0,
        },
      })

      return tx.drug.findUnique({
        where: { id: created.id },
        include: { discountConfig: true },
      })
    })

    return NextResponse.json(drug, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

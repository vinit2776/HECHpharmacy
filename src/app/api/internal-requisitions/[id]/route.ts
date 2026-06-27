import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, apiError } from '@/lib/auth-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(ALL_ROLES)
    const { id } = await params

    const ir = await prisma.internalRequisition.findUnique({
      where: { id },
      include: {
        requestedByUser: { select: { name: true } },
        approvedByUser: { select: { name: true } },
        doctor: { select: { name: true, registrationNo: true } },
        items: {
          include: {
            drug: { select: { name: true, schedule: true } },
            batch: { select: { quantityAvailable: true } },
          },
        },
      },
    })

    if (!ir) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      ...ir,
      totalCost: Number(ir.totalCost),
      items: ir.items.map((i) => ({ ...i, unitCost: Number(i.unitCost), totalCost: Number(i.totalCost) })),
    })
  } catch (e: any) {
    return apiError(e)
  }
}

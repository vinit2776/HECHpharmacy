import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, apiError} from '@/lib/auth-utils'
import { discountConfigSchema } from '@/lib/validations/drug'
import { createAuditLog } from '@/lib/db/audit'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(MANAGER_ROLES)

    const config = await prisma.drugDiscountConfig.findUnique({
      where: { drugId: params.id },
      include: { drug: { select: { id: true, name: true, brandName: true } } },
    })

    if (!config) {
      return NextResponse.json({ error: 'Discount config not found' }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (e: any) {
    return apiError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = discountConfigSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const existing = await prisma.drugDiscountConfig.findUnique({
      where: { drugId: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Discount config not found' }, { status: 404 })
    }

    const data = parsed.data
    const updated = await prisma.drugDiscountConfig.update({
      where: { drugId: params.id },
      data: {
        ...(data.discountApplicable !== undefined && { discountApplicable: data.discountApplicable }),
        ...(data.bplDiscountPct !== undefined && { bplDiscountPct: data.bplDiscountPct }),
        ...(data.generalDiscountPct !== undefined && { generalDiscountPct: data.generalDiscountPct }),
      },
    })

    await createAuditLog({
      userId: session.user.id as string,
      action: 'UPDATE_DISCOUNT',
      tableName: 'drug_discount_configs',
      recordId: existing.id,
      beforeData: existing,
      afterData: updated,
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return apiError(e)
  }
}

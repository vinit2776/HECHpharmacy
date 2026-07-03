import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, SUPER_ADMIN_ROLES, apiError } from '@/lib/auth-utils'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1, 'Manufacturer name is required'),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const existing = await prisma.manufacturer.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
    }

    const updated = await prisma.manufacturer.update({
      where: { id: params.id },
      data: { name: parsed.data.name },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return apiError(e)
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(SUPER_ADMIN_ROLES)

    const drugCount = await prisma.drug.count({ where: { manufacturerId: params.id } })
    if (drugCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${drugCount} drug(s) are linked to this manufacturer` },
        { status: 409 },
      )
    }

    await prisma.manufacturer.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return apiError(e)
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { z } from 'zod'

const doctorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  registrationNo: z.string().min(1).optional(),
  specialisation: z.string().optional(),
  type: z.enum(['internal', 'external']).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(ALL_ROLES)

    const doctor = await prisma.doctor.findUnique({
      where: { id: params.id },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    return NextResponse.json(doctor)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = doctorUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const existing = await prisma.doctor.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const data = parsed.data
    const updated = await prisma.doctor.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.registrationNo !== undefined && { registrationNo: data.registrationNo }),
        ...(data.specialisation !== undefined && { specialisation: data.specialisation }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

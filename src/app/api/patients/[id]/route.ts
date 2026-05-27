import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/db/audit'
import { z } from 'zod'

const patientUpdateSchema = z.object({
  hospitalPatientId: z.string().optional(),
  name: z.string().min(1).optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  patientCategory: z.enum(['bpl', 'general']).optional(),
  bplCardNo: z.string().optional(),
  doctorId: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(COUNTER_ROLES)

    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        doctor: { select: { id: true, name: true } },
        _count: {
          select: { bills: true },
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    return NextResponse.json(patient)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // Counter roles can update most fields; manager+ required if patientCategory changes
    const session = await requireRole(COUNTER_ROLES)

    const body = await req.json()
    const parsed = patientUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const existing = await prisma.patient.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const data = parsed.data

    // Check if patientCategory is being changed — requires manager+ role
    const categoryChanging = data.patientCategory !== undefined && data.patientCategory !== existing.patientCategory
    if (categoryChanging) {
      // Re-check with manager roles; throws Forbidden if insufficient
      await requireRole(MANAGER_ROLES)
    }

    const updated = await prisma.patient.update({
      where: { id: params.id },
      data: {
        ...(data.hospitalPatientId !== undefined && { hospitalPatientId: data.hospitalPatientId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.patientCategory !== undefined && { patientCategory: data.patientCategory }),
        ...(data.bplCardNo !== undefined && { bplCardNo: data.bplCardNo }),
        ...(data.doctorId !== undefined && { doctorId: data.doctorId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
    })

    if (categoryChanging) {
      await createAuditLog({
        userId: session.user.id as string,
        action: 'UPDATE_PATIENT_CATEGORY',
        tableName: 'patients',
        recordId: existing.id,
        beforeData: { patientCategory: existing.patientCategory },
        afterData: { patientCategory: updated.patientCategory },
      })
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

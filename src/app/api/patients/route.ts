import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES } from '@/lib/auth-utils'
import { patientSchema } from '@/lib/validations/patient'

export async function GET(req: Request) {
  try {
    await requireRole(COUNTER_ROLES)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { hospitalPatientId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const patients = await prisma.patient.findMany({
      where,
      include: {
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(patients)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(COUNTER_ROLES)

    const body = await req.json()
    const parsed = patientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const data = parsed.data
    const patient = await prisma.patient.create({
      data: {
        hospitalPatientId: data.hospitalPatientId,
        name: data.name,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        patientCategory: data.patientCategory,
        bplCardNo: data.bplCardNo,
        doctorId: data.doctorId,
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(patient, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

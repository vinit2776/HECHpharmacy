import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { z } from 'zod'

const doctorSchema = z.object({
  name: z.string().min(1, 'Doctor name is required'),
  registrationNo: z.string().min(1, 'Registration number is required'),
  specialisation: z.string().default('Ophthalmology'),
  type: z.enum(['internal', 'external']),
  phone: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    await requireRole(ALL_ROLES)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const type = searchParams.get('type')
    const isActiveParam = searchParams.get('isActive')

    const where: any = {}

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (type) {
      where.type = type
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(doctors)
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
    const parsed = doctorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const data = parsed.data
    const doctor = await prisma.doctor.create({
      data: {
        name: data.name,
        registrationNo: data.registrationNo,
        specialisation: data.specialisation,
        type: data.type,
        phone: data.phone,
      },
    })

    return NextResponse.json(doctor, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

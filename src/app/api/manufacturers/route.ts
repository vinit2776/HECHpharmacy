import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES, apiError } from '@/lib/auth-utils'
import { z } from 'zod'

const createSchema = z.object({
  code: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1, 'Manufacturer name is required'),
})

export async function GET() {
  try {
    await requireRole(ALL_ROLES)

    const manufacturers = await prisma.manufacturer.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { drugs: true } },
      },
    })

    return NextResponse.json(manufacturers)
  } catch (e: any) {
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const existing = await prisma.manufacturer.findUnique({ where: { code: parsed.data.code } })
    if (existing) {
      return NextResponse.json({ error: `Code "${parsed.data.code}" already exists` }, { status: 409 })
    }

    const manufacturer = await prisma.manufacturer.create({
      data: { code: parsed.data.code, name: parsed.data.name },
    })

    return NextResponse.json(manufacturer, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

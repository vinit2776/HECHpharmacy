import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES, apiError} from '@/lib/auth-utils'
import { z } from 'zod'

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  type: z.enum(['distributor', 'manufacturer', 'wholesaler']),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
  drugLicenseNo: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).default(30),
})

export async function GET(req: Request) {
  try {
    await requireRole(PURCHASE_ROLES)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const isActiveParam = searchParams.get('isActive')

    const where: any = {}

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(suppliers)
  } catch (e: any) {
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(PURCHASE_ROLES)

    const body = await req.json()
    const parsed = supplierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const data = parsed.data
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        type: data.type,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        gstin: data.gstin,
        drugLicenseNo: data.drugLicenseNo,
        paymentTermsDays: data.paymentTermsDays,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

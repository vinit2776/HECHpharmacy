import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/settings/pharmacy  — public to all logged-in users (bill printing needs it)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.pharmacySettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', pharmacyName: 'HCEH Eye Hospital Pharmacy' },
  })

  return NextResponse.json(settings)
}

// PUT /api/settings/pharmacy  — manager and super_admin only
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any)?.role
  if (role !== 'manager' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const {
    pharmacyName,
    address,
    city,
    state,
    pincode,
    phone,
    email,
    gstin,
    drugLicenseNo,
    cinNo,
    panNo,
  } = body

  if (!pharmacyName || String(pharmacyName).trim() === '') {
    return NextResponse.json({ error: 'Pharmacy name is required' }, { status: 400 })
  }

  // Basic GSTIN format: 15 alphanumeric chars
  if (gstin && !/^[0-9A-Z]{15}$/.test(String(gstin).toUpperCase())) {
    return NextResponse.json({ error: 'GSTIN must be exactly 15 alphanumeric characters' }, { status: 400 })
  }

  const settings = await prisma.pharmacySettings.upsert({
    where: { id: 'singleton' },
    update: {
      pharmacyName: String(pharmacyName).trim(),
      address:      address      ? String(address).trim()      : null,
      city:         city         ? String(city).trim()         : null,
      state:        state        ? String(state).trim()        : null,
      pincode:      pincode      ? String(pincode).trim()      : null,
      phone:        phone        ? String(phone).trim()        : null,
      email:        email        ? String(email).trim()        : null,
      gstin:        gstin        ? String(gstin).trim().toUpperCase() : null,
      drugLicenseNo: drugLicenseNo ? String(drugLicenseNo).trim() : null,
      cinNo:        cinNo        ? String(cinNo).trim()        : null,
      panNo:        panNo        ? String(panNo).trim().toUpperCase() : null,
    },
    create: {
      id: 'singleton',
      pharmacyName: String(pharmacyName).trim(),
      address:      address      ? String(address).trim()      : null,
      city:         city         ? String(city).trim()         : null,
      state:        state        ? String(state).trim()        : null,
      pincode:      pincode      ? String(pincode).trim()      : null,
      phone:        phone        ? String(phone).trim()        : null,
      email:        email        ? String(email).trim()        : null,
      gstin:        gstin        ? String(gstin).trim().toUpperCase() : null,
      drugLicenseNo: drugLicenseNo ? String(drugLicenseNo).trim() : null,
      cinNo:        cinNo        ? String(cinNo).trim()        : null,
      panNo:        panNo        ? String(panNo).trim().toUpperCase() : null,
    },
  })

  return NextResponse.json(settings)
}

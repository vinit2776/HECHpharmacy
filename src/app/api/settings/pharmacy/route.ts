import { NextRequest, NextResponse } from 'next/server'
import { withRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET /api/settings/pharmacy  — all logged-in roles (bill printing needs it)
export async function GET() {
  return withRole(ALL_ROLES, async () => {
    const settings = await prisma.pharmacySettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', pharmacyName: 'HCEH Eye Hospital Pharmacy' },
    })
    return NextResponse.json(settings)
  })
}

// PUT /api/settings/pharmacy  — manager and super_admin only
export async function PUT(req: NextRequest) {
  return withRole(MANAGER_ROLES, async () => {
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
    const gstinVal = gstin ? String(gstin).trim().toUpperCase() : null
    if (gstinVal && !/^[0-9A-Z]{15}$/.test(gstinVal)) {
      return NextResponse.json(
        { error: 'GSTIN must be exactly 15 alphanumeric characters' },
        { status: 400 }
      )
    }

    const panVal = panNo ? String(panNo).trim().toUpperCase() : null

    const data = {
      pharmacyName:  String(pharmacyName).trim(),
      address:       address      ? String(address).trim()      : null,
      city:          city         ? String(city).trim()         : null,
      state:         state        ? String(state).trim()        : null,
      pincode:       pincode      ? String(pincode).trim()      : null,
      phone:         phone        ? String(phone).trim()        : null,
      email:         email        ? String(email).trim()        : null,
      gstin:         gstinVal,
      drugLicenseNo: drugLicenseNo ? String(drugLicenseNo).trim() : null,
      cinNo:         cinNo        ? String(cinNo).trim()        : null,
      panNo:         panVal,
    }

    const settings = await prisma.pharmacySettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    })

    return NextResponse.json(settings)
  })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES, apiError } from '@/lib/auth-utils'
import { confirmBill } from '@/lib/db/billing'
import { withNumberRetry } from '@/lib/billing-numbers'
import { calculateLine } from '@/lib/discount/engine'
import { addDays } from 'date-fns'

export async function GET(req: Request) {
  try {
    await requireRole(COUNTER_ROLES)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status')
    const prescriptionSource = searchParams.get('prescriptionSource')
    const date = searchParams.get('date')

    const where: any = {}

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { patientName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (prescriptionSource) {
      where.prescriptionSource = prescriptionSource
    }

    if (date) {
      const day = new Date(date)
      where.billDate = { gte: day, lt: addDays(day, 1) }
    }

    const bills = await prisma.salesBill.findMany({
      where,
      include: {
        patient: true,
        doctor: true,
        servedByUser: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      bills.map((b) => ({
        ...b,
        netAmount: Number(b.netAmount),
        subtotalMrp: Number(b.subtotalMrp),
        totalDiscountAmount: Number(b.totalDiscountAmount),
        taxableAmount: Number(b.taxableAmount),
        totalGstAmount: Number(b.totalGstAmount),
      }))
    )
  } catch (e: any) {
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(COUNTER_ROLES)

    const body = await req.json()
    const {
      patientId,
      prescriptionSource,
      doctorId,
      prescriptionNo,
      prescriptionDate,
      paymentMode,
      paymentReference,
      items = [],
    } = body

    if (!patientId || !prescriptionSource || !paymentMode) {
      return NextResponse.json({ error: 'patientId, prescriptionSource, and paymentMode are required' }, { status: 422 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 422 })
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    let doctor: any = null
    if (doctorId) {
      doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
      if (!doctor) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
      }
    }

    // Fetch authoritative batch + drug data; compute all financials server-side.
    // Client-supplied discount/price fields are ignored to prevent manipulation.
    const resolvedItems = await Promise.all(
      items.map(async (item: any) => {
        if (!item.batchId || !item.drugId || !item.quantity || item.quantity < 1) {
          throw new Error(`Invalid item: batchId, drugId, and quantity (≥1) are required`)
        }
        const batch = await prisma.inventoryBatch.findUnique({
          where: { id: item.batchId },
          include: { drug: { include: { discountConfig: true } } },
        })
        if (!batch) throw new Error(`Batch ${item.batchId} not found`)
        if (batch.drugId !== item.drugId) throw new Error(`Batch does not belong to the specified drug`)
        if (batch.isQuarantined) throw new Error(`Batch ${batch.batchNo} is quarantined`)
        if (batch.expiryDate <= new Date()) throw new Error(`Batch ${batch.batchNo} is expired`)

        const drug = batch.drug
        const config = drug.discountConfig
        const calc = calculateLine({
          prescriptionSource,
          patientCategory: patient.patientCategory as 'bpl' | 'general',
          discountApplicable: config?.discountApplicable ?? false,
          bplDiscountPct: config ? Number(config.bplDiscountPct) : 0,
          generalDiscountPct: config ? Number(config.generalDiscountPct) : 0,
          mrpPerUnit: Number(batch.mrpPerUnit),
          quantity: item.quantity,
          gstRate: Number(drug.gstRate),
        })

        return {
          drugId: drug.id,
          batchId: batch.id,
          drugName: drug.name,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
          hsnCode: drug.hsnCode,
          schedule: drug.schedule,
          quantity: item.quantity,
          mrpPerUnit: Number(batch.mrpPerUnit),
          discountPctApplied: calc.discountPctApplied,
          discountAmount: calc.discountAmount,
          taxableAmount: calc.taxableAmount,
          gstRate: Number(drug.gstRate),
          gstAmount: calc.gstAmount,
          lineNetAmount: calc.lineNetAmount,
        }
      })
    )

    // Schedule H/H1 check uses the authoritative schedule from the DB, not the client
    const hasScheduledItems = resolvedItems.some((i) => {
      const s = String(i.schedule).toLowerCase()
      return s === 'h' || s === 'h1'
    })
    if (hasScheduledItems && !doctorId) {
      return NextResponse.json(
        { error: 'Doctor is required for Schedule H/H1 items' },
        { status: 422 }
      )
    }

    const round2 = (n: number) => Math.round(n * 100) / 100
    const subtotalMrp = round2(resolvedItems.reduce((s, i) => s + i.mrpPerUnit * i.quantity, 0))
    const totalDiscountAmount = round2(resolvedItems.reduce((s, i) => s + i.discountAmount, 0))
    const taxableAmount = round2(resolvedItems.reduce((s, i) => s + i.taxableAmount, 0))
    const totalGstAmount = round2(resolvedItems.reduce((s, i) => s + i.gstAmount, 0))
    const netAmount = round2(resolvedItems.reduce((s, i) => s + i.lineNetAmount, 0))

    const bill = await withNumberRetry(() =>
      confirmBill(
        {
          header: {
            billDate: new Date(),
            patientId,
            patientCategory: patient.patientCategory ?? 'general',
            doctorId: doctorId ?? undefined,
            prescriptionNo: prescriptionNo ?? undefined,
            prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : undefined,
            prescriptionSource,
            servedBy: session.user.id,
            subtotalMrp,
            totalDiscountAmount,
            taxableAmount,
            totalGstAmount,
            netAmount,
            paymentMode,
            paymentReference: paymentReference ?? undefined,
          },
          items: resolvedItems,
          patientName: patient.name,
          patientAge: patient.age ?? undefined,
          patientGender: patient.gender ?? undefined,
          doctorName: doctor?.name ?? undefined,
          doctorRegNo: doctor?.registrationNo ?? undefined,
        },
        session.user.id
      )
    )

    return NextResponse.json(bill, { status: 201 })
  } catch (e: any) {
    if (e.message?.startsWith('Insufficient stock') ||
        e.message?.startsWith('Batch') ||
        e.message?.startsWith('Invalid item') ||
        e.message?.startsWith('Doctor') ||
        e.message?.startsWith('Patient')) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    return apiError(e)
  }
}

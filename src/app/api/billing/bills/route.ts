import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES } from '@/lib/auth-utils'
import { generateBillNumber } from '@/lib/billing-numbers'
import { confirmBill } from '@/lib/db/billing'

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
      const nextDay = new Date(day)
      nextDay.setDate(nextDay.getDate() + 1)
      where.billDate = { gte: day, lt: nextDay }
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
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
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

    // Validate Schedule H/H1 items require internal prescription with doctor
    if (prescriptionSource === 'internal') {
      const hasScheduledItems = items.some((item: any) => {
        const s = (item.schedule ?? '').toLowerCase()
        return s === 'h' || s === 'h1'
      })
      if (hasScheduledItems && !doctorId) {
        return NextResponse.json(
          { error: 'Doctor is required for Schedule H/H1 items with internal prescription' },
          { status: 422 }
        )
      }
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

    const billNumber = await generateBillNumber()

    const subtotalMrp = items.reduce((sum: number, item: any) => sum + item.mrpPerUnit * item.quantity, 0)
    const totalDiscountAmount = items.reduce((sum: number, item: any) => sum + (item.discountAmount ?? 0), 0)
    const taxableAmount = items.reduce((sum: number, item: any) => sum + (item.taxableAmount ?? 0), 0)
    const totalGstAmount = items.reduce((sum: number, item: any) => sum + (item.gstAmount ?? 0), 0)
    const netAmount = items.reduce((sum: number, item: any) => sum + (item.lineNetAmount ?? 0), 0)

    const bill = await confirmBill(
      {
        header: {
          billNumber,
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
        items: items.map((item: any) => ({
          drugId: item.drugId,
          batchId: item.batchId,
          drugName: item.drugName,
          batchNo: item.batchNo,
          expiryDate: new Date(item.expiryDate),
          hsnCode: item.hsnCode,
          schedule: item.schedule,
          quantity: item.quantity,
          mrpPerUnit: item.mrpPerUnit,
          discountPctApplied: item.discountPctApplied,
          discountAmount: item.discountAmount,
          taxableAmount: item.taxableAmount,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          lineNetAmount: item.lineNetAmount,
        })),
        patientName: patient.name,
        patientAge: patient.age ?? undefined,
        patientGender: patient.gender ?? undefined,
        doctorName: doctor?.name ?? undefined,
        doctorRegNo: doctor?.registrationNo ?? undefined,
      },
      session.user.id
    )

    return NextResponse.json(bill, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

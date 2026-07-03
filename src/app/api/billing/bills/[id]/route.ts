import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES, apiError} from '@/lib/auth-utils'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(COUNTER_ROLES)

    const bill = await prisma.salesBill.findUnique({
      where: { id: params.id },
      include: {
        patient: true,
        doctor: true,
        servedByUser: { select: { name: true } },
        cancelledByUser: { select: { name: true } },
        items: {
          include: {
            drug: {
              include: {
                manufacturerRef: { select: { code: true } },
              },
            },
            batch: true,
          },
        },
        salesReturns: true,
        form18Entries: true,
      },
    })

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const netAmountNum = Number(bill.netAmount)
    const totalDiscountNum = Number(bill.totalDiscountAmount)
    const totalGstNum = Number(bill.totalGstAmount)
    return NextResponse.json({
      ...bill,
      walkinName: bill.walkinName ?? null,
      walkinPhone: bill.walkinPhone ?? null,
      netAmount: netAmountNum,
      subtotalMrp: Number(bill.subtotalMrp),
      totalDiscountAmount: totalDiscountNum,
      totalDiscount: totalDiscountNum,
      taxableAmount: Number(bill.taxableAmount),
      totalGstAmount: totalGstNum,
      totalGst: totalGstNum,
      totalAmount: netAmountNum,
      items: bill.items.map((item) => {
        const lineNetNum = Number(item.lineNetAmount)
        const discountPctNum = Number(item.discountPctApplied)
        return {
          ...item,
          mrpPerUnit: Number(item.mrpPerUnit),
          discountPctApplied: discountPctNum,
          discountPct: discountPctNum,
          discountAmount: Number(item.discountAmount),
          taxableAmount: Number(item.taxableAmount),
          gstRate: Number(item.gstRate),
          gstAmount: Number(item.gstAmount),
          lineNetAmount: lineNetNum,
          netAmount: lineNetNum,
          manufacturerCode: item.drug?.manufacturerRef?.code ?? null,
        }
      }),
    })
  } catch (e: any) {
    return apiError(e)
  }
}

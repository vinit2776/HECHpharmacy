import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/db/audit'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(COUNTER_ROLES)

    const body = await req.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 422 })
    }

    const bill = await prisma.salesBill.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (bill.status !== 'active') {
      return NextResponse.json({ error: 'Only active bills can be cancelled' }, { status: 422 })
    }

    const isManager = MANAGER_ROLES.includes(session.user.role as string)

    if (!isManager) {
      // Counter pharmacist can only cancel same-day bills
      const today = new Date()
      const billDate = new Date(bill.billDate)
      const isSameDay =
        billDate.getFullYear() === today.getFullYear() &&
        billDate.getMonth() === today.getMonth() &&
        billDate.getDate() === today.getDate()

      if (!isSameDay) {
        return NextResponse.json(
          { error: 'Counter pharmacists can only cancel same-day bills' },
          { status: 403 }
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.salesBill.update({
        where: { id: params.id },
        data: {
          status: 'cancelled',
          cancellationReason: reason,
          cancelledBy: session.user.id,
        },
      })

      // Restore stock for each item
      for (const item of bill.items) {
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: { quantityAvailable: { increment: item.quantity } },
        })
      }

      await createAuditLog({
        userId: session.user.id,
        action: 'CANCEL',
        tableName: 'sales_bills',
        recordId: bill.id,
        beforeData: { status: bill.status },
        afterData: { status: 'cancelled', cancellationReason: reason },
        tx,
      })

      return tx.salesBill.findUnique({
        where: { id: params.id },
        include: {
          patient: true,
          doctor: true,
          servedByUser: { select: { name: true } },
          cancelledByUser: { select: { name: true } },
          items: true,
        },
      })
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

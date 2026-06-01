import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, COUNTER_ROLES, MANAGER_ROLES, apiError } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/db/audit'
import { isSameDay } from 'date-fns'

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
      include: {
        items: true,
        // Fetch approved sales returns so we don't double-restore already-returned stock
        salesReturns: {
          where: { status: 'approved' },
          include: { items: true },
        },
      },
    })

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (bill.status !== 'active') {
      return NextResponse.json({ error: 'Only active bills can be cancelled' }, { status: 422 })
    }

    const isManager = MANAGER_ROLES.includes(session.user.role as string)

    if (!isManager) {
      // Counter pharmacist can only cancel same-day bills.
      // isSameDay compares calendar dates in the server's local timezone.
      // Ensure the server timezone matches the pharmacy timezone (e.g. TZ=Asia/Kolkata).
      if (!isSameDay(new Date(bill.billDate), new Date())) {
        return NextResponse.json(
          { error: 'Counter pharmacists can only cancel same-day bills' },
          { status: 403 }
        )
      }
    }

    // Build a map of batchId → quantity already returned to stock (from approved returns).
    // Cancellation must only restore the net remaining quantity to avoid double-crediting.
    const alreadyReturned = new Map<string, number>()
    for (const sr of bill.salesReturns) {
      for (const sri of sr.items) {
        if (sri.returnToStock) {
          alreadyReturned.set(sri.batchId, (alreadyReturned.get(sri.batchId) ?? 0) + sri.quantityReturned)
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Atomic status guard: updateMany with WHERE status='active' ensures only one
      // concurrent cancel request wins even if two arrive simultaneously.
      const guard = await tx.salesBill.updateMany({
        where: { id: params.id, status: 'active' },
        data: {
          status: 'cancelled',
          cancellationReason: reason,
          cancelledBy: session.user.id,
        },
      })
      if (guard.count === 0) {
        throw new Error('Bill is no longer active')
      }

      // Restore stock for each item, minus what was already returned via approved sales returns
      for (const item of bill.items) {
        const returned = alreadyReturned.get(item.batchId) ?? 0
        const netRestore = item.quantity - returned
        if (netRestore > 0) {
          await tx.inventoryBatch.update({
            where: { id: item.batchId },
            data: { quantityAvailable: { increment: netRestore } },
          })
        }
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
    if (e.message === 'Bill is no longer active') {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    return apiError(e)
  }
}

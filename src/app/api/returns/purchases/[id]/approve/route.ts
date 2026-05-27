import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/db/audit'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const body = await req.json()
    const { decision, rejectionReason } = body

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!purchaseReturn) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 })
    }

    if (purchaseReturn.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Only pending_approval returns can be actioned' },
        { status: 422 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (decision === 'approve') {
        for (const item of purchaseReturn.items) {
          await tx.inventoryBatch.update({
            where: { id: item.batchId },
            data: { quantityAvailable: { decrement: item.quantityReturned } },
          })
        }

        await tx.purchaseReturn.update({
          where: { id: params.id },
          data: {
            status: 'approved',
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        })

        await createAuditLog({
          userId: session.user.id,
          action: 'APPROVE_PURCHASE_RETURN',
          tableName: 'purchase_returns',
          recordId: params.id,
          afterData: { status: 'approved', returnNumber: purchaseReturn.returnNumber },
          tx,
        })
      } else if (decision === 'reject') {
        await tx.purchaseReturn.update({
          where: { id: params.id },
          data: {
            status: 'rejected',
            rejectionReason: rejectionReason ?? null,
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        })

        await createAuditLog({
          userId: session.user.id,
          action: 'REJECT_PURCHASE_RETURN',
          tableName: 'purchase_returns',
          recordId: params.id,
          afterData: { status: 'rejected', returnNumber: purchaseReturn.returnNumber, rejectionReason },
          tx,
        })
      } else {
        throw new Error('Invalid decision. Must be "approve" or "reject"')
      }

      return tx.purchaseReturn.findUnique({
        where: { id: params.id },
        include: {
          originalGrn: { include: { supplier: true } },
          supplier: true,
          initiatedByUser: { select: { name: true } },
          approvedByUser: { select: { name: true } },
          items: { include: { drug: true, batch: true } },
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

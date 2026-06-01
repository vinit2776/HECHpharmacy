import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, apiError } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/db/audit'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const body = await req.json()
    const { decision, rejectionReason } = body

    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 422 })
    }

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id: params.id },
      include: { items: { include: { batch: true, drug: true } } },
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
        // Atomic status guard: only one concurrent approve wins
        const guard = await tx.purchaseReturn.updateMany({
          where: { id: params.id, status: 'pending_approval' },
          data: {
            status: 'approved',
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        })
        if (guard.count === 0) {
          throw new Error('Return is no longer pending approval')
        }

        for (const item of purchaseReturn.items) {
          // Guard: only decrement if sufficient stock exists
          const deducted = await tx.inventoryBatch.updateMany({
            where: { id: item.batchId, quantityAvailable: { gte: item.quantityReturned } },
            data: { quantityAvailable: { decrement: item.quantityReturned } },
          })
          if (deducted.count === 0) {
            const drugName = item.drug?.name ?? item.batchId
            const batchNo = item.batch?.batchNo ?? item.batchId
            throw new Error(`Insufficient stock for ${drugName} (batch ${batchNo}) to approve return`)
          }
        }

        await createAuditLog({
          userId: session.user.id,
          action: 'APPROVE_PURCHASE_RETURN',
          tableName: 'purchase_returns',
          recordId: params.id,
          afterData: { status: 'approved', returnNumber: purchaseReturn.returnNumber },
          tx,
        })
      } else {
        // reject
        const guard = await tx.purchaseReturn.updateMany({
          where: { id: params.id, status: 'pending_approval' },
          data: {
            status: 'rejected',
            rejectionReason: rejectionReason ?? null,
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        })
        if (guard.count === 0) {
          throw new Error('Return is no longer pending approval')
        }

        await createAuditLog({
          userId: session.user.id,
          action: 'REJECT_PURCHASE_RETURN',
          tableName: 'purchase_returns',
          recordId: params.id,
          afterData: { status: 'rejected', returnNumber: purchaseReturn.returnNumber, rejectionReason },
          tx,
        })
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
    if (e.message === 'Return is no longer pending approval' ||
        e.message?.startsWith('Insufficient stock')) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    return apiError(e)
  }
}

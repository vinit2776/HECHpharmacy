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
    const { decision, rejectionReason, items } = body

    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 422 })
    }

    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!salesReturn) {
      return NextResponse.json({ error: 'Sales return not found' }, { status: 404 })
    }

    if (salesReturn.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Only pending_approval returns can be actioned' },
        { status: 422 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (decision === 'approve') {
        // Atomic status guard: only one concurrent approve wins
        const guard = await tx.salesReturn.updateMany({
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

        // Merge returnToStock overrides from request body
        const itemOverrides: Record<string, boolean> = {}
        if (items && Array.isArray(items)) {
          for (const i of items) {
            itemOverrides[i.itemId] = i.returnToStock
          }
        }

        for (const item of salesReturn.items) {
          const returnToStock =
            itemOverrides[item.id] !== undefined
              ? itemOverrides[item.id]
              : item.returnToStock

          if (itemOverrides[item.id] !== undefined) {
            await tx.salesReturnItem.update({
              where: { id: item.id },
              data: { returnToStock: itemOverrides[item.id] },
            })
          }

          if (returnToStock) {
            await tx.inventoryBatch.update({
              where: { id: item.batchId },
              data: { quantityAvailable: { increment: item.quantityReturned } },
            })
          }
        }

        await createAuditLog({
          userId: session.user.id,
          action: 'APPROVE_SALES_RETURN',
          tableName: 'sales_returns',
          recordId: params.id,
          afterData: { status: 'approved', returnNumber: salesReturn.returnNumber },
          tx,
        })
      } else {
        // reject
        const guard = await tx.salesReturn.updateMany({
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
          action: 'REJECT_SALES_RETURN',
          tableName: 'sales_returns',
          recordId: params.id,
          afterData: { status: 'rejected', returnNumber: salesReturn.returnNumber, rejectionReason },
          tx,
        })
      }

      return tx.salesReturn.findUnique({
        where: { id: params.id },
        include: {
          originalBill: { include: { patient: true } },
          initiatedByUser: { select: { name: true } },
          approvedByUser: { select: { name: true } },
          items: { include: { drug: true, batch: true } },
        },
      })
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Return is no longer pending approval') {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    return apiError(e)
  }
}

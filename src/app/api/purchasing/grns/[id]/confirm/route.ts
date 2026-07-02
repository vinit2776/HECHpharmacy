import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, PURCHASE_ROLES, apiError} from '@/lib/auth-utils'
import { buildForm17 } from '@/lib/db/registers'
import { createAuditLog } from '@/lib/db/audit'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(PURCHASE_ROLES)

    const grn = await prisma.purchaseGrn.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        items: { include: { drug: true } },
      },
    })

    if (!grn) {
      return NextResponse.json({ error: 'GRN not found' }, { status: 404 })
    }

    if (grn.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft GRNs can be confirmed' }, { status: 422 })
    }

    const confirmed = await prisma.$transaction(async (tx) => {
      await tx.purchaseGrn.update({
        where: { id: grn.id },
        data: { status: 'confirmed' },
      })

      for (const item of grn.items) {
        const totalQty = item.quantity + (item.freeQuantity ?? 0)

        await tx.inventoryBatch.create({
          data: {
            drugId: item.drugId,
            batchNo: item.batchNo,
            manufacturedDate: item.manufacturedDate ?? null,
            expiryDate: item.expiryDate,
            mrpPerUnit: item.mrpPerUnit,
            purchaseRatePerUnit: item.purchaseRatePerUnit,
            quantityReceived: totalQty,
            quantityAvailable: totalQty,
            supplierId: grn.supplierId,
            grnId: grn.id,
          },
        })

        const schedule = item.drug?.schedule ?? ''
        if (schedule.toLowerCase() === 'h' || schedule.toLowerCase() === 'h1') {
          await tx.registerForm17.create({
            data: buildForm17({
              grnId: grn.id,
              drugId: item.drugId,
              drugName: item.drug?.name ?? '',
              schedule,
              supplierName: grn.supplier.name,
              supplierDlNo: grn.supplier.drugLicenseNo ?? undefined,
              supplierInvoiceNo: grn.supplierInvoiceNo ?? '',
              supplierInvoiceDate: grn.supplierInvoiceDate ?? new Date(),
              batchNo: item.batchNo,
              manufacturedDate: item.manufacturedDate ?? undefined,
              expiryDate: item.expiryDate,
              quantityReceived: totalQty,
              mrp: Number(item.mrpPerUnit),
              purchaseRate: Number(item.purchaseRatePerUnit),
            }),
          })
        }
      }

      await createAuditLog({
        userId: session.user.id,
        action: 'CONFIRM',
        tableName: 'purchase_grns',
        recordId: grn.id,
        afterData: { grnNumber: grn.grnNumber, status: 'confirmed' },
        tx,
      })

      return tx.purchaseGrn.findUnique({
        where: { id: grn.id },
        include: {
          supplier: true,
          receivedByUser: { select: { name: true } },
          items: { include: { drug: true } },
          inventoryBatches: true,
          form17Entries: true,
        },
      })
    })

    return NextResponse.json(confirmed)
  } catch (e: any) {
    return apiError(e)
  }
}

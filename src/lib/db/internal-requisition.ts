import { prisma } from '../prisma'
import { createAuditLog } from './audit'
import { generateIRNumberInTx } from '../billing-numbers'

interface IRItemInput {
  drugId: string
  batchId: string
  drugName: string
  batchNo: string
  expiryDate: Date
  hsnCode: string
  schedule: string
  quantityIssued: number
  unitCost: number
}

interface IRCreateInput {
  requisitionDate: Date
  department: string
  purpose: string
  doctorId?: string
  notes?: string
  requestedBy: string
  items: IRItemInput[]
}

export async function createRequisition(data: IRCreateInput) {
  return prisma.$transaction(async (tx) => {
    const requisitionNumber = await generateIRNumberInTx(tx)

    const totalCost = data.items.reduce((sum, i) => sum + i.unitCost * i.quantityIssued, 0)

    const ir = await tx.internalRequisition.create({
      data: {
        requisitionNumber,
        requisitionDate: data.requisitionDate,
        department: data.department as any,
        purpose: data.purpose as any,
        doctorId: data.doctorId ?? null,
        requestedBy: data.requestedBy,
        notes: data.notes ?? null,
        totalCost,
      },
    })

    for (const item of data.items) {
      await tx.internalRequisitionItem.create({
        data: {
          requisitionId: ir.id,
          drugId: item.drugId,
          batchId: item.batchId,
          drugName: item.drugName,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          hsnCode: item.hsnCode,
          schedule: item.schedule,
          quantityIssued: item.quantityIssued,
          unitCost: item.unitCost,
          totalCost: item.unitCost * item.quantityIssued,
        },
      })
    }

    await createAuditLog({
      userId: data.requestedBy,
      action: 'CREATE',
      tableName: 'internal_requisitions',
      recordId: ir.id,
      afterData: { requisitionNumber, department: data.department, purpose: data.purpose, status: 'draft' },
      tx,
    })

    return ir
  })
}

export async function issueRequisition(id: string, approverId: string) {
  return prisma.$transaction(async (tx) => {
    const ir = await tx.internalRequisition.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!ir) throw new Error('Requisition not found')
    if (ir.status !== 'draft') throw new Error('Requisition is not in draft status')

    // Verify and deduct stock for every item atomically
    const insufficientItems: string[] = []
    for (const item of ir.items) {
      const deducted = await tx.inventoryBatch.updateMany({
        where: { id: item.batchId, quantityAvailable: { gte: item.quantityIssued } },
        data: { quantityAvailable: { decrement: item.quantityIssued } },
      })
      if (deducted.count === 0) {
        const batch = await tx.inventoryBatch.findUnique({ where: { id: item.batchId } })
        insufficientItems.push(
          `${item.drugName} (batch ${item.batchNo}): need ${item.quantityIssued}, available ${batch?.quantityAvailable ?? 0}`
        )
      }
    }

    if (insufficientItems.length > 0) {
      throw new Error(`Insufficient stock:\n${insufficientItems.join('\n')}`)
    }

    const updated = await tx.internalRequisition.update({
      where: { id },
      data: {
        status: 'issued',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    })

    await createAuditLog({
      userId: approverId,
      action: 'ISSUE',
      tableName: 'internal_requisitions',
      recordId: id,
      beforeData: { status: 'draft' },
      afterData: { status: 'issued', approvedBy: approverId },
      tx,
    })

    return updated
  })
}

export async function cancelRequisition(id: string, userId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const ir = await tx.internalRequisition.findUnique({ where: { id } })
    if (!ir) throw new Error('Requisition not found')
    if (ir.status !== 'draft') throw new Error('Only draft requisitions can be cancelled')

    const updated = await tx.internalRequisition.update({
      where: { id },
      data: { status: 'cancelled', cancellationReason: reason },
    })

    await createAuditLog({
      userId,
      action: 'CANCEL',
      tableName: 'internal_requisitions',
      recordId: id,
      beforeData: { status: 'draft' },
      afterData: { status: 'cancelled', reason },
      tx,
    })

    return updated
  })
}

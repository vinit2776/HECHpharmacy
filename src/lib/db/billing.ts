import { prisma } from '../prisma'
import { buildForm18 } from './registers'
import { createAuditLog } from './audit'
import { generateBillNumberInTx } from '../billing-numbers'

interface BillItemInput {
  drugId: string
  batchId: string
  drugName: string
  batchNo: string
  expiryDate: Date
  hsnCode: string
  schedule: string
  quantity: number
  mrpPerUnit: number
  discountPctApplied: number
  discountAmount: number
  taxableAmount: number
  gstRate: number
  gstAmount: number
  lineNetAmount: number
}

interface BillCreateInput {
  header: {
    billDate: Date
    patientId: string
    patientCategory: string
    doctorId?: string
    prescriptionNo?: string
    prescriptionDate?: Date
    prescriptionSource: 'internal' | 'external'
    servedBy: string
    subtotalMrp: number
    totalDiscountAmount: number
    taxableAmount: number
    totalGstAmount: number
    netAmount: number
    paymentMode: 'cash' | 'upi' | 'card' | 'credit'
    paymentReference?: string
    walkinName?: string
    walkinPhone?: string
  }
  items: BillItemInput[]
  patientName: string
  patientAge?: number
  patientGender?: string
  doctorName?: string
  doctorRegNo?: string
}

export async function confirmBill(data: BillCreateInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    // Generate number inside the transaction so the count read and the insert
    // are in the same unit of work. Caller wraps this in withNumberRetry to
    // handle the rare case where two concurrent transactions pick the same count.
    const billNumber = await generateBillNumberInTx(tx)

    const bill = await tx.salesBill.create({ data: { ...data.header, billNumber } })

    for (const item of data.items) {
      await tx.salesBillItem.create({
        data: {
          billId: bill.id,
          drugId: item.drugId,
          batchId: item.batchId,
          drugName: item.drugName,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
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
        },
      })

      // Guard: only decrement if sufficient stock exists.
      // updateMany returns count=0 if the WHERE is not satisfied; we treat that as
      // an oversell attempt and abort the transaction.
      const deducted = await tx.inventoryBatch.updateMany({
        where: { id: item.batchId, quantityAvailable: { gte: item.quantity } },
        data: { quantityAvailable: { decrement: item.quantity } },
      })
      if (deducted.count === 0) {
        throw new Error(`Insufficient stock for ${item.drugName} (batch ${item.batchNo})`)
      }

      const schedule = item.schedule.toLowerCase()
      if (schedule === 'h' || schedule === 'h1') {
        await tx.registerForm18.create({
          data: buildForm18({
            billId: bill.id,
            drugId: item.drugId,
            drugName: item.drugName,
            schedule: item.schedule,
            batchNo: item.batchNo,
            quantitySold: item.quantity,
            patientName: data.patientName,
            patientAge: data.patientAge,
            patientGender: data.patientGender,
            doctorName: data.doctorName ?? '',
            doctorRegNo: data.doctorRegNo ?? '',
            prescriptionNo: data.header.prescriptionNo,
            prescriptionDate: data.header.prescriptionDate,
            isH1: schedule === 'h1',
          }),
        })
      }
    }

    await createAuditLog({
      userId,
      action: 'CREATE',
      tableName: 'sales_bills',
      recordId: bill.id,
      afterData: { billNumber: bill.billNumber, netAmount: bill.netAmount },
      tx,
    })

    return bill
  })
}

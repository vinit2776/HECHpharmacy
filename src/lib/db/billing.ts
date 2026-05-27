import { prisma } from '../prisma'
import { buildForm18 } from './registers'
import { createAuditLog } from './audit'

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
    billNumber: string
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
    const bill = await tx.salesBill.create({ data: data.header })

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

      await tx.inventoryBatch.update({
        where: { id: item.batchId },
        data: { quantityAvailable: { decrement: item.quantity } },
      })

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

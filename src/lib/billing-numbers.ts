import { prisma } from './prisma'
import { format } from 'date-fns'

export async function generateBillNumber(): Promise<string> {
  const now = new Date()
  const prefix = `BILL-${format(now, 'yyyyMM')}-`
  const count = await prisma.salesBill.count({
    where: { billNumber: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function generateGrnNumber(): Promise<string> {
  const now = new Date()
  const prefix = `GRN-${format(now, 'yyyyMM')}-`
  const count = await prisma.purchaseGrn.count({
    where: { grnNumber: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function generateSalesReturnNumber(): Promise<string> {
  const now = new Date()
  const prefix = `SR-${format(now, 'yyyyMM')}-`
  const count = await prisma.salesReturn.count({
    where: { returnNumber: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function generatePurchaseReturnNumber(): Promise<string> {
  const now = new Date()
  const prefix = `PR-${format(now, 'yyyyMM')}-`
  const count = await prisma.purchaseReturn.count({
    where: { returnNumber: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

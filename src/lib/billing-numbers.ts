import { format } from 'date-fns'

// Generate a sequential document number inside an existing Prisma transaction.
// By generating and inserting in the same transaction, the unique-constraint
// on the number column acts as the final guard. Callers should retry on P2002.

export async function generateBillNumberInTx(tx: any): Promise<string> {
  const prefix = `BILL-${format(new Date(), 'yyyyMM')}-`
  const count = await tx.salesBill.count({ where: { billNumber: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function generateGrnNumberInTx(tx: any): Promise<string> {
  const prefix = `GRN-${format(new Date(), 'yyyyMM')}-`
  const count = await tx.purchaseGrn.count({ where: { grnNumber: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function generateSalesReturnNumberInTx(tx: any): Promise<string> {
  const prefix = `SR-${format(new Date(), 'yyyyMM')}-`
  const count = await tx.salesReturn.count({ where: { returnNumber: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function generatePurchaseReturnNumberInTx(tx: any): Promise<string> {
  const prefix = `PR-${format(new Date(), 'yyyyMM')}-`
  const count = await tx.purchaseReturn.count({ where: { returnNumber: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

// Convenience: retry a transaction callback on P2002 (unique constraint) up to maxAttempts.
// Use when the transaction generates a sequential document number internally.
export async function generateIRNumberInTx(tx: any): Promise<string> {
  const prefix = `IR-${format(new Date(), 'yyyyMM')}-`
  const count = await tx.internalRequisition.count({ where: { requisitionNumber: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export async function withNumberRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e: any) {
      if (e.code === 'P2002' && attempt < maxAttempts - 1) continue
      throw e
    }
  }
  throw new Error('Failed to generate a unique document number after retries')
}

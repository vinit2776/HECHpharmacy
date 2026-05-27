import { prisma } from '../prisma'

export async function getAvailableBatches(drugId: string) {
  return prisma.inventoryBatch.findMany({
    where: {
      drugId,
      quantityAvailable: { gt: 0 },
      isQuarantined: false,
      expiryDate: { gt: new Date() },
    },
    orderBy: { expiryDate: 'asc' }, // FIFO by earliest expiry
  })
}

export async function decrementStock(batchId: string, quantity: number, tx?: any) {
  const db = tx ?? prisma
  return db.inventoryBatch.update({
    where: { id: batchId },
    data: { quantityAvailable: { decrement: quantity } },
  })
}

export async function restoreStock(batchId: string, quantity: number, tx?: any) {
  const db = tx ?? prisma
  return db.inventoryBatch.update({
    where: { id: batchId },
    data: { quantityAvailable: { increment: quantity } },
  })
}

export async function getDrugStockSummary() {
  const batches = await prisma.inventoryBatch.findMany({
    include: { drug: { include: { discountConfig: true } } },
    orderBy: { expiryDate: 'asc' },
  })

  const drugMap = new Map<string, any>()
  const now = new Date()
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  for (const batch of batches) {
    const existing = drugMap.get(batch.drugId)
    const totalStock = (existing?.totalStock ?? 0) + batch.quantityAvailable
    const hasNearExpiry = batch.expiryDate <= in90Days && batch.quantityAvailable > 0
    const hasExpired = batch.expiryDate < now
    const hasQuarantined = batch.isQuarantined

    drugMap.set(batch.drugId, {
      drug: batch.drug,
      totalStock,
      hasNearExpiry: (existing?.hasNearExpiry ?? false) || hasNearExpiry,
      hasExpired: (existing?.hasExpired ?? false) || hasExpired,
      hasQuarantined: (existing?.hasQuarantined ?? false) || hasQuarantined,
      batchCount: (existing?.batchCount ?? 0) + 1,
      lastUpdated: batch.createdAt,
    })
  }

  return Array.from(drugMap.values())
}

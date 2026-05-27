import cron from 'node-cron'
import { REPORT_REGISTRY } from './registry'
import { enqueueReport } from './engine'
import { prisma } from '../prisma'
import { format } from 'date-fns'

function buildAutoParams(defId: string): Record<string, string> {
  const now = new Date()
  return {
    date: format(now, 'yyyy-MM-dd'),
    month: format(now, 'yyyy-MM'),
    year: format(now, 'yyyy'),
  }
}

async function checkLowStockAlerts() {
  const batches = await prisma.inventoryBatch.findMany({
    where: { quantityAvailable: { gt: 0 }, isQuarantined: false },
    include: { drug: true },
  })
  for (const batch of batches) {
    if (batch.quantityAvailable <= batch.drug.reorderLevel) {
      console.log(`[LOW STOCK] ${batch.drug.name}: ${batch.quantityAvailable} units remaining`)
    }
  }
}

async function checkNearExpiryAlerts() {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const batches = await prisma.inventoryBatch.findMany({
    where: {
      expiryDate: { lte: in30Days, gt: new Date() },
      quantityAvailable: { gt: 0 },
    },
    include: { drug: true },
  })
  for (const batch of batches) {
    console.log(`[NEAR EXPIRY] ${batch.drug.name} batch ${batch.batchNo} expires ${batch.expiryDate.toLocaleDateString()}`)
  }
}

async function flagH1SugamPending() {
  const pending = await prisma.registerForm18.count({
    where: { isH1: true, sugamUploadStatus: 'pending' },
  })
  if (pending > 0) {
    console.log(`[H1 SUGAM] ${pending} H1 entries pending Sugam upload`)
  }
}

export function initScheduler() {
  REPORT_REGISTRY
    .filter((def) => def.schedule)
    .forEach((def) => {
      cron.schedule(def.schedule!, () => {
        enqueueReport(def.id, buildAutoParams(def.id), def.formats[0], null).catch(console.error)
      })
    })

  cron.schedule('0 7 * * *', checkLowStockAlerts)
  cron.schedule('0 7 * * 1', checkNearExpiryAlerts)
  cron.schedule('0 0 * * *', async () => {
    const { runDatabaseBackup } = await import('../backup')
    runDatabaseBackup().catch(console.error)
  })
  cron.schedule('0 8 1 * *', flagH1SugamPending)

  console.log('[Scheduler] Initialized')
}

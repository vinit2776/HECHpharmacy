import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Vercel Cron: runs at 07:00 IST daily (01:30 UTC).
// Logs low-stock and near-expiry alerts to the console (visible in Vercel logs).
// Called by vercel.json cron schedule — protected by CRON_SECRET header.

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [lowStock, nearExpiry, h1Pending] = await Promise.all([
    checkLowStock(),
    checkNearExpiry(),
    checkH1SugamPending(),
  ])

  return NextResponse.json({ lowStock, nearExpiry, h1Pending })
}

async function checkLowStock(): Promise<number> {
  const batches = await prisma.inventoryBatch.findMany({
    where: { quantityAvailable: { gt: 0 }, isQuarantined: false },
    include: { drug: { select: { name: true, reorderLevel: true } } },
  })
  const alerts = batches.filter((b) => b.quantityAvailable <= b.drug.reorderLevel)
  for (const b of alerts) {
    console.log(`[LOW STOCK] ${b.drug.name}: ${b.quantityAvailable} units (reorder: ${b.drug.reorderLevel})`)
  }
  return alerts.length
}

async function checkNearExpiry(): Promise<number> {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const batches = await prisma.inventoryBatch.findMany({
    where: {
      expiryDate: { lte: in30Days, gt: new Date() },
      quantityAvailable: { gt: 0 },
    },
    include: { drug: { select: { name: true } } },
  })
  for (const b of batches) {
    console.log(`[NEAR EXPIRY] ${b.drug.name} batch ${b.batchNo} expires ${b.expiryDate.toLocaleDateString('en-IN')}`)
  }
  return batches.length
}

async function checkH1SugamPending(): Promise<number> {
  const pending = await prisma.registerForm18.count({
    where: { isH1: true, sugamUploadStatus: 'pending' },
  })
  if (pending > 0) {
    console.log(`[H1 SUGAM] ${pending} H1 entries pending Sugam upload`)
  }
  return pending
}

import { NextResponse } from 'next/server'
import { REPORT_REGISTRY } from '@/lib/reports/registry'
import { enqueueReport } from '@/lib/reports/engine'
import { format } from 'date-fns'

// Vercel Cron: runs at 21:00 IST daily (15:30 UTC) and 08:00 IST on 1st of month (02:30 UTC).
// Called by vercel.json cron schedule — protected by CRON_SECRET header.

function buildAutoParams(): Record<string, string> {
  const now = new Date()
  return {
    date: format(now, 'yyyy-MM-dd'),
    month: format(now, 'yyyy-MM'),
    year: format(now, 'yyyy'),
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = buildAutoParams()
  const scheduled = REPORT_REGISTRY.filter((def) => def.schedule)

  const results = await Promise.allSettled(
    scheduled.map((def) => enqueueReport(def.id, params, def.formats[0], null))
  )

  const queued = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`[cron/reports] Queued ${queued} reports, ${failed} failed`)
  return NextResponse.json({ queued, failed })
}

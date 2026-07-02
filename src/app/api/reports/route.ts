import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, apiError } from '@/lib/auth-utils'
import { enqueueReport } from '@/lib/reports/engine'
import { REPORT_REGISTRY } from '@/lib/reports/registry'

export async function GET(req: Request) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    const where: any = {}
    if (category) where.category = category
    if (status) where.status = status

    const reports = await prisma.report.findMany({
      where,
      include: {
        requestedByUser: { select: { name: true } },
      },
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json(
      reports.map((r) => ({ ...r, name: r.reportName }))
    )
  } catch (e: any) {
    return apiError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const body = await req.json()
    const { reportDefId, params, format } = body

    const def = REPORT_REGISTRY.find((d) => d.id === reportDefId)
    if (!def) {
      return NextResponse.json({ error: 'Unknown report type' }, { status: 422 })
    }
    if (!def.formats.includes(format)) {
      return NextResponse.json({ error: `Format must be one of: ${def.formats.join(', ')}` }, { status: 422 })
    }

    const reportId = await enqueueReport(reportDefId, params, format, session.user.id)

    return NextResponse.json({ id: reportId, status: 'queued' }, { status: 201 })
  } catch (e: any) {
    return apiError(e)
  }
}

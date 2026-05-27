import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES } from '@/lib/auth-utils'
import { enqueueReport } from '@/lib/reports/engine'

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
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(MANAGER_ROLES)
    const body = await req.json()
    const { reportDefId, params, format } = body

    const reportId = await enqueueReport(reportDefId, params, format, session.user.id)

    return NextResponse.json({ id: reportId, status: 'queued' }, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

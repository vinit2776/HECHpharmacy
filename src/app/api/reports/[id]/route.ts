import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES, apiError} from '@/lib/auth-utils'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(MANAGER_ROLES)

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        requestedByUser: { select: { name: true } },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json(report)
  } catch (e: any) {
    return apiError(e)
  }
}

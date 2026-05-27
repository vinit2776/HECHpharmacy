import { createReadStream } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES } from '@/lib/auth-utils'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(MANAGER_ROLES)

    const report = await prisma.report.findUnique({ where: { id: params.id } })
    if (!report?.filePath || report.status !== 'ready') {
      return new Response('Not found', { status: 404 })
    }

    const fullPath = path.join(process.env.REPORTS_BASE_PATH ?? '/tmp/', report.filePath)
    const ext = report.format
    const mime =
      ext === 'pdf' ? 'application/pdf'
      : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : ext === 'csv' ? 'text/csv'
      : 'application/json'

    return new Response(createReadStream(fullPath) as any, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${report.reportName}.${ext}"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return new Response('Unauthorized', { status: 401 })
    if (e.message === 'Forbidden') return new Response('Forbidden', { status: 403 })
    return new Response(e.message, { status: 500 })
  }
}

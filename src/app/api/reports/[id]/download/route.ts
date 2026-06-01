import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireRole, MANAGER_ROLES } from '@/lib/auth-utils'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(MANAGER_ROLES)

    const report = await prisma.report.findUnique({ where: { id: params.id } })
    if (!report || report.status !== 'ready') {
      return new Response('Report not found or not ready', { status: 404 })
    }

    const ext = report.format
    const mime =
      ext === 'pdf'  ? 'application/pdf'
      : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : ext === 'csv'  ? 'text/csv'
      : 'application/json'

    const headers = {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${report.reportName}.${ext}"`,
    }

    // Primary: serve from DB bytes (works on Vercel — no ephemeral /tmp dependency)
    if (report.fileData) {
      return new Response(report.fileData, { headers })
    }

    // Fallback: serve from local filesystem (self-hosted deployments)
    if (report.filePath) {
      const fullPath = path.join(process.env.REPORTS_BASE_PATH ?? '/tmp/', report.filePath)
      if (existsSync(fullPath)) {
        return new Response(createReadStream(fullPath) as any, { headers })
      }
    }

    return new Response('Report file not available. Please regenerate the report.', { status: 410 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return new Response('Unauthorized', { status: 401 })
    if (e.message === 'Forbidden') return new Response('Forbidden', { status: 403 })
    return new Response(e.message, { status: 500 })
  }
}

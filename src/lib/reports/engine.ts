import path from 'path'
import fs from 'fs'
import { prisma } from '../prisma'
import { getReportDef } from './registry'
import { reportQueries } from './queries'

const REPORTS_BASE_PATH = process.env.REPORTS_BASE_PATH ?? '/tmp/PharmacyReports/'

export function buildFilePath(defId: string, params: any, format: string): string {
  const def = getReportDef(defId)
  if (!def) throw new Error(`Unknown report: ${defId}`)
  const folder = path.join(def.category, defId)
  const date = params.date ?? params.month ?? params.year ?? new Date().toISOString().slice(0, 10)
  const dateRange = params.from_date && params.to_date
    ? `${params.from_date}_to_${params.to_date}`
    : date
  return path.join(folder, `${dateRange}.${format}`)
}

export async function generateReport(reportDbId: string): Promise<void> {
  await prisma.report.update({
    where: { id: reportDbId },
    data: { status: 'generating' },
  })

  try {
    const report = await prisma.report.findUniqueOrThrow({ where: { id: reportDbId } })
    const def = getReportDef(report.reportDefId)
    if (!def) throw new Error(`Unknown report definition: ${report.reportDefId}`)

    const queryFn = reportQueries[def.id]
    if (!queryFn) throw new Error(`No query function for: ${def.id}`)

    const data = await queryFn(report.params as any)
    const filePath = buildFilePath(def.id, report.params, report.format)
    const fullPath = path.join(REPORTS_BASE_PATH, filePath)

    fs.mkdirSync(path.dirname(fullPath), { recursive: true })

    if (report.format === 'pdf') {
      const { renderPDF } = await import('./renderers/pdf')
      const buffer = await renderPDF(def.id, data)
      fs.writeFileSync(fullPath, buffer)
    } else if (report.format === 'xlsx') {
      const { renderExcel } = await import('./renderers/excel')
      const buffer = await renderExcel(def.id, data)
      fs.writeFileSync(fullPath, buffer)
    } else if (report.format === 'csv') {
      const { renderCSV } = await import('./renderers/csv')
      const content = renderCSV(def.id, data)
      fs.writeFileSync(fullPath, content, 'utf-8')
    } else if (report.format === 'json') {
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    const stat = fs.statSync(fullPath)
    await prisma.report.update({
      where: { id: reportDbId },
      data: {
        status: 'ready',
        filePath,
        fileSizeBytes: stat.size,
        generatedAt: new Date(),
      },
    })
  } catch (err: any) {
    await prisma.report.update({
      where: { id: reportDbId },
      data: { status: 'failed', errorMessage: err.message },
    })
  }
}

export async function enqueueReport(
  defId: string,
  params: Record<string, string>,
  format: string,
  requestedBy: string | null
): Promise<string> {
  const def = getReportDef(defId)
  if (!def) throw new Error(`Unknown report: ${defId}`)

  const periodLabel = params.date ?? params.month ?? params.year ?? 'All'

  const report = await prisma.report.create({
    data: {
      reportDefId: defId,
      reportName: def.name,
      category: def.category,
      status: 'queued',
      requestedBy: requestedBy ?? undefined,
      params,
      periodLabel,
      format,
    },
  })

  // Generate async — don't await
  generateReport(report.id).catch(console.error)

  return report.id
}

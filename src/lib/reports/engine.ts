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

    let fileBuffer: Buffer

    if (report.format === 'pdf') {
      const { renderPDF } = await import('./renderers/pdf')
      fileBuffer = await renderPDF(def.id, data)
    } else if (report.format === 'xlsx') {
      const { renderExcel } = await import('./renderers/excel')
      fileBuffer = await renderExcel(def.id, data)
    } else if (report.format === 'csv') {
      const { renderCSV } = await import('./renderers/csv')
      fileBuffer = Buffer.from(renderCSV(def.id, data), 'utf-8')
    } else {
      fileBuffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
    }

    // Store in DB (works on Vercel where /tmp is ephemeral per-invocation)
    // Also write to local filesystem as a fallback for self-hosted
    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, fileBuffer)
    } catch {
      // filesystem write is best-effort; DB copy is the primary store
    }

    await prisma.report.update({
      where: { id: reportDbId },
      data: {
        status: 'ready',
        filePath,
        fileData: new Uint8Array(fileBuffer),
        fileSizeBytes: fileBuffer.length,
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

import ExcelJS from 'exceljs'

export async function renderExcel(reportId: string, data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Eye Hospital Pharmacy'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Report')
  sheet.getCell('A1').value = 'Eye Hospital Pharmacy'
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A2').value = `Report ID: ${reportId}`
  sheet.getCell('A3').value = `Generated: ${new Date().toLocaleString('en-IN')}`

  // Generic tabular rendering — specific reports override this
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0])
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
    for (const row of data) {
      sheet.addRow(headers.map((h) => row[h]))
    }
    sheet.columns.forEach((col) => { col.width = 18 })
  } else if (data && typeof data === 'object') {
    let rowIdx = 5
    for (const [key, val] of Object.entries(data)) {
      sheet.getCell(`A${rowIdx}`).value = key
      sheet.getCell(`B${rowIdx}`).value = String(val)
      rowIdx++
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

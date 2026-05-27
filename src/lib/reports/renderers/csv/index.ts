export function renderCSV(reportId: string, data: any): string {
  if (reportId === 'h1-register') {
    // Sugam-compatible CSV format for H1 register
    const rows = Array.isArray(data) ? data : []
    const headers = [
      'Date', 'Drug Name', 'Batch No', 'Qty Sold',
      'Patient Name', 'Patient Age', 'Patient Gender',
      'Doctor Name', 'Doctor Reg No', 'Prescription No', 'Prescription Date',
      'Sugam Status',
    ]
    const lines = [headers.join(',')]
    for (const row of rows) {
      lines.push([
        row.entryDate?.toISOString?.()?.slice(0, 10) ?? '',
        row.drugName ?? '',
        row.batchNo ?? '',
        row.quantitySold ?? '',
        row.patientName ?? '',
        row.patientAge ?? '',
        row.patientGender ?? '',
        row.doctorName ?? '',
        row.doctorRegNo ?? '',
        row.prescriptionNo ?? '',
        row.prescriptionDate?.toISOString?.()?.slice(0, 10) ?? '',
        row.sugamUploadStatus ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    }
    return lines.join('\n')
  }

  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0])
    const lines = [headers.join(',')]
    for (const row of data) {
      lines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
    }
    return lines.join('\n')
  }

  return JSON.stringify(data)
}

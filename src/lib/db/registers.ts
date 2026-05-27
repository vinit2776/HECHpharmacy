interface Form17Input {
  grnId: string
  drugId: string
  drugName: string
  schedule: string
  supplierName: string
  supplierDlNo?: string
  supplierInvoiceNo: string
  supplierInvoiceDate: Date
  batchNo: string
  manufacturedDate?: Date
  expiryDate: Date
  quantityReceived: number
  mrp: number
  purchaseRate: number
}

export function buildForm17(input: Form17Input) {
  return {
    entryDate: new Date(),
    grnId: input.grnId,
    drugId: input.drugId,
    drugName: input.drugName,
    schedule: input.schedule,
    supplierName: input.supplierName,
    supplierDlNo: input.supplierDlNo,
    supplierInvoiceNo: input.supplierInvoiceNo,
    supplierInvoiceDate: input.supplierInvoiceDate,
    batchNo: input.batchNo,
    manufacturedDate: input.manufacturedDate,
    expiryDate: input.expiryDate,
    quantityReceived: input.quantityReceived,
    mrp: input.mrp,
    purchaseRate: input.purchaseRate,
  }
}

interface Form18Input {
  billId: string
  drugId: string
  drugName: string
  schedule: string
  batchNo: string
  quantitySold: number
  patientName: string
  patientAge?: number
  patientGender?: string
  doctorName: string
  doctorRegNo: string
  prescriptionNo?: string
  prescriptionDate?: Date
  isH1: boolean
}

export function buildForm18(input: Form18Input) {
  return {
    entryDate: new Date(),
    billId: input.billId,
    drugId: input.drugId,
    drugName: input.drugName,
    schedule: input.schedule,
    batchNo: input.batchNo,
    quantitySold: input.quantitySold,
    patientName: input.patientName,
    patientAge: input.patientAge,
    patientGender: input.patientGender,
    doctorName: input.doctorName,
    doctorRegNo: input.doctorRegNo,
    prescriptionNo: input.prescriptionNo,
    prescriptionDate: input.prescriptionDate,
    isH1: input.isH1,
    sugamUploadStatus: 'pending' as const,
  }
}

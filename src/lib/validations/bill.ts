import { z } from 'zod'

export const billItemSchema = z.object({
  drugId: z.string().min(1),
  batchId: z.string().min(1),
  drugName: z.string().min(1),
  batchNo: z.string().min(1),
  expiryDate: z.string().min(1),
  hsnCode: z.string().min(1),
  schedule: z.string().min(1),
  quantity: z.number().int().min(1),
  mrpPerUnit: z.number().min(0),
  discountPctApplied: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
  taxableAmount: z.number().min(0),
  gstRate: z.number().min(0),
  gstAmount: z.number().min(0),
  lineNetAmount: z.number().min(0),
})

export const billSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  prescriptionSource: z.enum(['internal', 'external']),
  doctorId: z.string().optional(),
  prescriptionNo: z.string().optional(),
  prescriptionDate: z.string().optional(),
  paymentMode: z.enum(['cash', 'upi', 'card', 'credit']),
  paymentReference: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one drug is required'),
})

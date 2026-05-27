import { z } from 'zod'

export const grnItemSchema = z.object({
  drugId: z.string().min(1),
  batchNo: z.string().min(1, 'Batch number is required'),
  manufacturedDate: z.string().optional(),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  quantity: z.number().int().min(1),
  freeQuantity: z.number().int().min(0).default(0),
  mrpPerUnit: z.number().min(0),
  purchaseRatePerUnit: z.number().min(0),
  tradeDiscountPct: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0),
  gstAmount: z.number().min(0),
  lineTotal: z.number().min(0),
  notes: z.string().optional(),
  coldChainVerified: z.boolean().optional(),
})

export const grnSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierInvoiceNo: z.string().min(1, 'Invoice number is required'),
  supplierInvoiceDate: z.string().min(1, 'Invoice date is required'),
  receivedDate: z.string().min(1, 'Received date is required'),
  items: z.array(grnItemSchema).min(1, 'At least one drug line is required'),
  notes: z.string().optional(),
})

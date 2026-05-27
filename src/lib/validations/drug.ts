import { z } from 'zod'

export const drugSchema = z.object({
  name: z.string().min(1, 'Drug name is required'),
  brandName: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  dosageForm: z.enum(['eye_drop', 'eye_ointment', 'oral_tablet', 'oral_syrup', 'injection', 'ointment', 'other']),
  strength: z.string().optional(),
  packSize: z.string().optional(),
  packUnit: z.enum(['bottle', 'strip', 'vial', 'tube', 'box', 'sachet', 'unit']),
  schedule: z.enum(['otc', 'g', 'h', 'h1', 'e1']),
  hsnCode: z.string().min(1, 'HSN code is required'),
  gstRate: z.number().min(0).max(28),
  coldChainRequired: z.boolean().default(false),
  coldChainMinTemp: z.number().optional(),
  coldChainMaxTemp: z.number().optional(),
  reorderLevel: z.number().int().min(0).default(10),
  barcode: z.string().optional(),
  notes: z.string().optional(),
})

export const discountConfigSchema = z.object({
  discountApplicable: z.boolean(),
  bplDiscountPct: z.number().min(0).max(100),
  generalDiscountPct: z.number().min(0).max(100),
})

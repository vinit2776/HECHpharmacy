import { z } from 'zod'

export const patientSchema = z.object({
  hospitalPatientId: z.string().optional(),
  name: z.string().min(1, 'Patient name is required'),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  patientCategory: z.enum(['bpl', 'general']),
  bplCardNo: z.string().optional(),
  doctorId: z.string().optional(),
}).refine((data) => {
  if (data.patientCategory === 'bpl' && !data.bplCardNo) return false
  return true
}, { message: 'BPL card number is required for BPL patients', path: ['bplCardNo'] })

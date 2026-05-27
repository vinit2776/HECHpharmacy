export type UserRole = 'counter_pharmacist' | 'purchase_pharmacist' | 'manager' | 'super_admin'

export type DrugSchedule = 'otc' | 'g' | 'h' | 'h1' | 'e1'
export type DrugDosageForm = 'eye_drop' | 'eye_ointment' | 'oral_tablet' | 'oral_syrup' | 'injection' | 'ointment' | 'other'
export type DrugPackUnit = 'bottle' | 'strip' | 'vial' | 'tube' | 'box' | 'sachet' | 'unit'

export type PatientCategory = 'bpl' | 'general'
export type Gender = 'male' | 'female' | 'other'
export type DoctorType = 'internal' | 'external'
export type SupplierType = 'distributor' | 'manufacturer' | 'wholesaler'
export type PrescriptionSource = 'internal' | 'external'
export type PaymentMode = 'cash' | 'upi' | 'card' | 'credit'
export type BillStatus = 'active' | 'cancelled' | 'returned'
export type ReturnStatus = 'pending_approval' | 'approved' | 'rejected'
export type GrnStatus = 'draft' | 'confirmed'
export type PaymentStatus = 'pending' | 'partial' | 'paid'
export type SugamUploadStatus = 'pending' | 'uploaded' | 'failed'
export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed'
export type PurchaseReturnReason = 'expired' | 'damaged' | 'short_expiry' | 'quality' | 'excess'

export type BatchComputedStatus =
  | 'available'
  | 'low_stock'
  | 'out_of_stock'
  | 'near_expiry'
  | 'expired'
  | 'quarantined'

export function computeBatchStatus(params: {
  quantityAvailable: number
  reorderLevel: number
  expiryDate: Date
  isQuarantined: boolean
}): BatchComputedStatus {
  if (params.isQuarantined) return 'quarantined'
  if (params.expiryDate < new Date()) return 'expired'
  if (params.quantityAvailable === 0) return 'out_of_stock'
  if (params.quantityAvailable <= params.reorderLevel) return 'low_stock'
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  if (params.expiryDate <= in90Days) return 'near_expiry'
  return 'available'
}

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    role?: string
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role?: string
    }
  }
}

// JWT type augmentation — next-auth v5 beta derives JWT types from Session
// eslint-disable-next-line @typescript-eslint/no-empty-interface

import { create } from 'zustand'

export interface CartItem {
  drugId: string
  batchId: string
  drugName: string
  brandName?: string
  schedule: string
  batchNo: string
  expiryDate: string
  hsnCode: string
  quantity: number
  mrpPerUnit: number
  discountPctApplied: number
  discountAmount: number
  taxableAmount: number
  gstRate: number
  gstAmount: number
  lineNetAmount: number
  discountLabel: string
}

interface PatientInfo {
  id: string
  name: string
  age?: number
  gender?: string
  patientCategory: 'bpl' | 'general'
  hospitalPatientId?: string
}

interface PrescriptionInfo {
  source: 'internal' | 'external'
  doctorId?: string
  doctorName?: string
  doctorRegNo?: string
  prescriptionNo?: string
  prescriptionDate?: string
}

interface BillingState {
  step: number
  patient: PatientInfo | null
  prescription: PrescriptionInfo | null
  items: CartItem[]
  paymentMode: 'cash' | 'upi' | 'card' | 'credit'
  paymentReference: string
  walkinName: string
  walkinPhone: string

  setStep: (step: number) => void
  setPatient: (patient: PatientInfo | null) => void
  setPrescription: (prescription: PrescriptionInfo) => void
  setWalkinDetails: (name: string, phone: string) => void
  addItem: (item: CartItem) => void
  updateItem: (drugId: string, batchId: string, updates: Partial<CartItem>) => void
  removeItem: (drugId: string, batchId: string) => void
  setPaymentMode: (mode: 'cash' | 'upi' | 'card' | 'credit') => void
  setPaymentReference: (ref: string) => void
  reset: () => void

  get subtotalMrp(): number
  get totalDiscount(): number
  get totalGst(): number
  get netAmount(): number
}

const initialState = {
  step: 1,
  patient: null,
  prescription: null,
  items: [] as CartItem[],
  paymentMode: 'cash' as const,
  paymentReference: '',
  walkinName: '',
  walkinPhone: '',
}

export const useBillingStore = create<BillingState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setPatient: (patient) => set({ patient }),
  setPrescription: (prescription) => set({ prescription }),
  setWalkinDetails: (name, phone) => set({ walkinName: name, walkinPhone: phone }),

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.drugId === item.drugId && i.batchId === item.batchId
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.drugId === item.drugId && i.batchId === item.batchId ? item : i
          ),
        }
      }
      return { items: [...state.items, item] }
    }),

  updateItem: (drugId, batchId, updates) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.drugId === drugId && i.batchId === batchId ? { ...i, ...updates } : i
      ),
    })),

  removeItem: (drugId, batchId) =>
    set((state) => ({
      items: state.items.filter((i) => !(i.drugId === drugId && i.batchId === batchId)),
    })),

  setPaymentMode: (mode) => set({ paymentMode: mode }),
  setPaymentReference: (ref) => set({ paymentReference: ref }),
  reset: () => set(initialState),

  get subtotalMrp() {
    return get().items.reduce((acc, i) => acc + i.mrpPerUnit * i.quantity, 0)
  },
  get totalDiscount() {
    return get().items.reduce((acc, i) => acc + i.discountAmount, 0)
  },
  get totalGst() {
    return get().items.reduce((acc, i) => acc + i.gstAmount, 0)
  },
  get netAmount() {
    return get().items.reduce((acc, i) => acc + i.lineNetAmount, 0)
  },
}))

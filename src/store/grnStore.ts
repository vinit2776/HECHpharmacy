import { create } from 'zustand'

export interface GrnLineItem {
  drugId: string
  drugName: string
  schedule: string
  coldChainRequired: boolean
  coldChainMinTemp?: number
  coldChainMaxTemp?: number
  batchNo: string
  manufacturedDate?: string
  expiryDate: string
  quantity: number
  freeQuantity: number
  mrpPerUnit: number
  purchaseRatePerUnit: number
  tradeDiscountPct: number
  gstRate: number
  gstAmount: number
  lineTotal: number
  coldChainVerified?: boolean
  notes?: string
}

interface GrnDraft {
  supplierId: string
  supplierName: string
  supplierInvoiceNo: string
  supplierInvoiceDate: string
  receivedDate: string
  items: GrnLineItem[]
  notes?: string
}

interface GrnState {
  step: number
  draft: GrnDraft
  setStep: (step: number) => void
  setHeader: (data: Partial<GrnDraft>) => void
  addItem: (item: GrnLineItem) => void
  updateItem: (index: number, updates: Partial<GrnLineItem>) => void
  removeItem: (index: number) => void
  reset: () => void
  get totalAmount(): number
  get totalGst(): number
  get netPayable(): number
}

const initialDraft: GrnDraft = {
  supplierId: '',
  supplierName: '',
  supplierInvoiceNo: '',
  supplierInvoiceDate: new Date().toISOString().slice(0, 10),
  receivedDate: new Date().toISOString().slice(0, 10),
  items: [],
}

export const useGrnStore = create<GrnState>((set, get) => ({
  step: 1,
  draft: { ...initialDraft },

  setStep: (step) => set({ step }),

  setHeader: (data) =>
    set((state) => ({ draft: { ...state.draft, ...data } })),

  addItem: (item) =>
    set((state) => ({ draft: { ...state.draft, items: [...state.draft.items, item] } })),

  updateItem: (index, updates) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.map((item, i) => (i === index ? { ...item, ...updates } : item)),
      },
    })),

  removeItem: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.filter((_, i) => i !== index),
      },
    })),

  reset: () => set({ step: 1, draft: { ...initialDraft } }),

  get totalAmount() {
    return get().draft.items.reduce((acc, i) => acc + i.lineTotal, 0)
  },
  get totalGst() {
    return get().draft.items.reduce((acc, i) => acc + i.gstAmount, 0)
  },
  get netPayable() {
    return get().draft.items.reduce((acc, i) => acc + i.lineTotal, 0)
  },
}))

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { StepWizard } from '@/components/shared/StepWizard'
import { ConfirmGate } from '@/components/shared/ConfirmGate'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useGrnStore } from '@/store/grnStore'
import { toast } from 'sonner'
import { Search, Plus, Trash2, AlertTriangle, Snowflake, X } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

const STEPS = ['Supplier & Invoice', 'Add Drugs', 'Review', 'Confirm']

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)
}

// Step 1: Supplier & Invoice
function Step1({ onNext }: { onNext: () => void }) {
  const { draft, setHeader } = useGrnStore()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/suppliers?isActive=true').then(r => r.json()).then(setSuppliers)
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!draft.supplierId) e.supplierId = 'Supplier is required'
    if (!draft.supplierInvoiceNo) e.supplierInvoiceNo = 'Invoice number is required'
    if (!draft.supplierInvoiceDate) e.supplierInvoiceDate = 'Invoice date is required'
    if (!draft.receivedDate) e.receivedDate = 'Received date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <Label htmlFor="supplier">Supplier <span className="text-red-500">*</span></Label>
        <Select
          value={draft.supplierId}
          onValueChange={(v) => {
            const s = suppliers.find(s => s.id === v)
            setHeader({ supplierId: v, supplierName: s?.name ?? '' })
          }}
        >
          <SelectTrigger id="supplier" className="mt-1">
            <SelectValue placeholder="Select supplier…" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>}
        <p className="text-xs text-slate-500 mt-1">Select the company that supplied these drugs</p>
      </div>

      <div>
        <Label htmlFor="invoiceNo">Supplier Invoice No <span className="text-red-500">*</span></Label>
        <Input
          id="invoiceNo"
          value={draft.supplierInvoiceNo}
          onChange={(e) => setHeader({ supplierInvoiceNo: e.target.value })}
          placeholder="e.g. INV-2025-001"
          className="mt-1"
        />
        {errors.supplierInvoiceNo && <p className="text-red-500 text-xs mt-1">{errors.supplierInvoiceNo}</p>}
        <p className="text-xs text-slate-500 mt-1">The invoice number printed on the supplier&apos;s bill</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="invoiceDate">Invoice Date <span className="text-red-500">*</span></Label>
          <Input
            id="invoiceDate"
            type="date"
            value={draft.supplierInvoiceDate}
            onChange={(e) => setHeader({ supplierInvoiceDate: e.target.value })}
            className="mt-1"
          />
          {errors.supplierInvoiceDate && <p className="text-red-500 text-xs mt-1">{errors.supplierInvoiceDate}</p>}
        </div>
        <div>
          <Label htmlFor="receivedDate">Date Received <span className="text-red-500">*</span></Label>
          <Input
            id="receivedDate"
            type="date"
            value={draft.receivedDate}
            onChange={(e) => setHeader({ receivedDate: e.target.value })}
            className="mt-1"
          />
          {errors.receivedDate && <p className="text-red-500 text-xs mt-1">{errors.receivedDate}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={() => { if (validate()) onNext() }}>Next →</Button>
      </div>
    </div>
  )
}

// Step 2: Add Drugs
function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { draft, addItem, updateItem, removeItem } = useGrnStore()
  const [search, setSearch] = useState('')
  const [drugResults, setDrugResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [coldChainModal, setColdChainModal] = useState<{ drug: any; itemIndex: number } | null>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    if (search.length < 2) { setDrugResults([]); return }
    const t = setTimeout(() => {
      setSearching(true)
      fetch(`/api/drugs?search=${encodeURIComponent(search)}&isActive=true`)
        .then(r => r.json())
        .then(setDrugResults)
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function selectDrug(drug: any) {
    setSearch('')
    setDrugResults([])
    const newItem = {
      drugId: drug.id,
      drugName: drug.name,
      schedule: drug.schedule,
      coldChainRequired: drug.coldChainRequired,
      coldChainMinTemp: drug.coldChainMinTemp,
      coldChainMaxTemp: drug.coldChainMaxTemp,
      batchNo: '',
      manufacturedDate: '',
      expiryDate: '',
      quantity: 1,
      freeQuantity: 0,
      mrpPerUnit: 0,
      purchaseRatePerUnit: 0,
      tradeDiscountPct: 0,
      gstRate: Number(drug.gstRate),
      gstAmount: 0,
      lineTotal: 0,
      coldChainVerified: undefined as boolean | undefined,
    }
    addItem(newItem)
    const idx = draft.items.length
    if (drug.coldChainRequired) {
      setColdChainModal({ drug, itemIndex: idx })
    }
  }

  function recalcItem(index: number, updates: any) {
    const item = { ...draft.items[index], ...updates }
    const baseAmt = item.mrpPerUnit * item.quantity
    const discountedRate = item.purchaseRatePerUnit * (1 - item.tradeDiscountPct / 100)
    const lineBeforeGst = discountedRate * (item.quantity + item.freeQuantity)
    const gstAmount = lineBeforeGst * item.gstRate / 100
    const lineTotal = lineBeforeGst + gstAmount
    updateItem(index, { ...updates, gstAmount: Math.round(gstAmount * 100) / 100, lineTotal: Math.round(lineTotal * 100) / 100 })
  }

  function expiryWarning(expiryDate: string) {
    if (!expiryDate) return null
    const days = differenceInDays(parseISO(expiryDate), new Date())
    if (days < 90) return { level: 'red' as const, msg: `Expires in ${days} days — confirm with manager before accepting` }
    if (days < 180) return { level: 'amber' as const, msg: `Short expiry (${days} days) — note before accepting` }
    return null
  }

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Scan barcode or type drug name…"
          className="pl-9"
        />
        <p className="text-xs text-slate-500 mt-1">Scan the barcode on the drug pack or type the name to search</p>
        {drugResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 bg-white border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
            {drugResults.map((drug) => (
              <button
                key={drug.id}
                onClick={() => selectDrug(drug)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{drug.name}</p>
                  <p className="text-xs text-slate-500">{drug.brandName} · {drug.category}</p>
                </div>
                <Badge variant="outline" className="text-xs">{drug.schedule.toUpperCase()}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {draft.items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-lg">
          <p className="text-sm">Search and add drugs above to build your GRN</p>
        </div>
      ) : (
        <div className="space-y-4">
          {draft.items.map((item, idx) => {
            const warning = expiryWarning(item.expiryDate)
            return (
              <div key={idx} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{item.drugName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{item.schedule.toUpperCase()}</Badge>
                      {item.coldChainRequired && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <Snowflake className="w-3 h-3" /> Cold Chain Required
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Batch No *</Label>
                    <Input value={item.batchNo} onChange={(e) => updateItem(idx, { batchNo: e.target.value })} placeholder="e.g. B2401" className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Mfg Date</Label>
                    <Input type="date" value={item.manufacturedDate} onChange={(e) => updateItem(idx, { manufacturedDate: e.target.value })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Expiry Date *</Label>
                    <Input type="date" value={item.expiryDate} onChange={(e) => updateItem(idx, { expiryDate: e.target.value })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Qty *</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => recalcItem(idx, { quantity: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Free Qty</Label>
                    <Input type="number" min={0} value={item.freeQuantity} onChange={(e) => recalcItem(idx, { freeQuantity: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">MRP/Unit *</Label>
                    <Input type="number" min={0} step="0.01" value={item.mrpPerUnit || ''} onChange={(e) => recalcItem(idx, { mrpPerUnit: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Purchase Rate/Unit *</Label>
                    <Input type="number" min={0} step="0.01" value={item.purchaseRatePerUnit || ''} onChange={(e) => recalcItem(idx, { purchaseRatePerUnit: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Trade Disc%</Label>
                    <Input type="number" min={0} max={100} step="0.01" value={item.tradeDiscountPct} onChange={(e) => recalcItem(idx, { tradeDiscountPct: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="text-xs text-slate-500">GST {item.gstRate}%: {formatCurrency(item.gstAmount)}</div>
                  <div className="text-sm font-semibold">Line Total: {formatCurrency(item.lineTotal)}</div>
                </div>

                {warning && (
                  <Alert className={`mt-3 ${warning.level === 'red' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                    <AlertTriangle className={`w-4 h-4 ${warning.level === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
                    <AlertDescription className={`text-xs ${warning.level === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
                      {warning.msg}
                    </AlertDescription>
                  </Alert>
                )}

                {item.coldChainRequired && item.coldChainVerified === false && (
                  <Alert className="mt-3 border-red-300 bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <AlertDescription className="text-xs text-red-700">
                      Cold chain verification failed — this batch will be quarantined on confirmation.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cold chain dialog */}
      {coldChainModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Snowflake className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Cold Chain Verification</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{coldChainModal.drug.name}</strong> requires cold chain storage ({coldChainModal.drug.coldChainMinTemp}°C – {coldChainModal.drug.coldChainMaxTemp}°C).
              Was the receiving temperature within this range?
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => {
                  updateItem(coldChainModal.itemIndex, { coldChainVerified: true })
                  setColdChainModal(null)
                }}
              >
                Yes — Temperature OK
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  updateItem(coldChainModal.itemIndex, { coldChainVerified: false })
                  setColdChainModal(null)
                }}
              >
                No — Quarantine
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.success('Draft saved — you can resume this GRN from the Purchases list.')}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => {
              if (draft.items.length === 0) { toast.error('Add at least one drug'); return }
              const invalid = draft.items.find(i => !i.batchNo || !i.expiryDate || i.mrpPerUnit === 0)
              if (invalid) { toast.error(`Complete all required fields for ${invalid.drugName}`); return }
              onNext()
            }}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step 3: Review
function Step3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { draft } = useGrnStore()
  const totalGst = draft.items.reduce((a, i) => a + i.gstAmount, 0)
  const netPayable = draft.items.reduce((a, i) => a + i.lineTotal, 0)

  return (
    <div>
      <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-slate-500">Supplier</p><p className="font-semibold">{draft.supplierName}</p></div>
          <div><p className="text-slate-500">Invoice No</p><p className="font-semibold">{draft.supplierInvoiceNo}</p></div>
          <div><p className="text-slate-500">Received</p><p className="font-semibold">{draft.receivedDate}</p></div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Drug</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Batch</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Expiry</th>
              <th className="text-right px-4 py-2 font-medium text-slate-600">Qty</th>
              <th className="text-right px-4 py-2 font-medium text-slate-600">MRP</th>
              <th className="text-right px-4 py-2 font-medium text-slate-600">Rate</th>
              <th className="text-right px-4 py-2 font-medium text-slate-600">GST</th>
              <th className="text-right px-4 py-2 font-medium text-slate-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {draft.items.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium">{item.drugName}</td>
                <td className="px-4 py-2 font-mono text-xs">{item.batchNo}</td>
                <td className="px-4 py-2 text-xs">{item.expiryDate}</td>
                <td className="px-4 py-2 text-right">{item.quantity}{item.freeQuantity > 0 ? `+${item.freeQuantity}` : ''}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(item.mrpPerUnit)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(item.purchaseRatePerUnit)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(item.gstAmount)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">GST Total</span><span>+ {formatCurrency(totalGst)}</span></div>
          <Separator />
          <div className="flex justify-between font-bold text-base"><span>Net Payable</span><span>{formatCurrency(netPayable)}</span></div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>← Back to Edit</Button>
        <Button onClick={onNext}>Confirm Receipt →</Button>
      </div>
    </div>
  )
}

export default function NewGrnPage() {
  const router = useRouter()
  const { step, setStep, draft, reset } = useGrnStore()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    try {
      // First save as draft, then confirm
      const saveRes = await fetch('/api/purchasing/grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: draft.supplierId,
          supplierInvoiceNo: draft.supplierInvoiceNo,
          supplierInvoiceDate: draft.supplierInvoiceDate,
          receivedDate: draft.receivedDate,
          notes: draft.notes,
          items: draft.items.map(i => ({
            drugId: i.drugId,
            batchNo: i.batchNo,
            manufacturedDate: i.manufacturedDate || undefined,
            expiryDate: i.expiryDate,
            quantity: i.quantity,
            freeQuantity: i.freeQuantity,
            mrpPerUnit: i.mrpPerUnit,
            purchaseRatePerUnit: i.purchaseRatePerUnit,
            tradeDiscountPct: i.tradeDiscountPct,
            gstRate: i.gstRate,
            gstAmount: i.gstAmount,
            lineTotal: i.lineTotal,
            coldChainVerified: i.coldChainVerified,
          })),
        }),
      })

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save GRN')
      }
      const grn = await saveRes.json()

      const confirmRes = await fetch(`/api/purchasing/grns/${grn.id}/confirm`, { method: 'POST' })
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to confirm GRN')
      }

      toast.success('GRN confirmed — stock added to inventory')
      reset()
      router.push(`/purchasing/${grn.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setConfirming(false)
      setConfirmOpen(false)
    }
  }

  const totalItems = draft.items.length
  const netPayable = draft.items.reduce((a, i) => a + i.lineTotal, 0)

  return (
    <div>
      <PageHeader
        title="New Purchase (GRN)"
        breadcrumb={[{ label: 'Purchases', href: '/purchasing' }, { label: 'New GRN' }]}
      />
      <StepWizard steps={STEPS} currentStep={step} />

      {step === 1 && <Step1 onNext={() => setStep(2)} />}
      {step === 2 && <Step2 onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && (
        <Step3
          onNext={() => setConfirmOpen(true)}
          onBack={() => setStep(2)}
        />
      )}

      <ConfirmGate
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Stock Receipt?"
        consequence={`• ${totalItems} drug batch${totalItems !== 1 ? 'es' : ''} will be added to inventory\n• Form 17 (Purchase Register) entries will be created automatically\n• Net payable: ${formatCurrency(netPayable)}\n• This cannot be undone — corrections require raising a Purchase Return`}
        confirmLabel="Yes, Confirm Receipt"
        cancelLabel="Go Back"
        onConfirm={handleConfirm}
        loading={confirming}
      />
    </div>
  )
}

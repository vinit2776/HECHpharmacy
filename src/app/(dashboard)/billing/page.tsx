'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  User,
  Pill,
  ClipboardList,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  UserX,
  Loader2,
  Stethoscope,
  AlertTriangle,
} from 'lucide-react'

import { useBillingStore, CartItem } from '@/store/billingStore'
import { StepWizard } from '@/components/shared/StepWizard'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
import { ConfirmGate } from '@/components/shared/ConfirmGate'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

// ─── helpers ────────────────────────────────────────────────────────────────

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function ScheduleBadge({ schedule }: { schedule: string }) {
  const s = schedule?.toUpperCase()
  if (s === 'H1')
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        H1
      </span>
    )
  if (s === 'H')
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        H
      </span>
    )
  return null
}

// ─── types ───────────────────────────────────────────────────────────────────

interface PatientResult {
  id: string
  hospitalPatientId: string
  name: string
  age?: number
  gender?: string
  patientCategory: 'bpl' | 'general'
  bplCardNo?: string
  doctorId?: string
  doctor?: { name: string }
}

interface DrugResult {
  id: string
  name: string
  brandName?: string
  category: string
  schedule: string
  gstRate: number
  coldChainRequired?: boolean
}

interface BatchResult {
  id: string
  batchNo: string
  expiryDate: string
  availableQty: number
  mrpPerUnit: number
  hsnCode?: string
}

interface DiscountPreviewResult {
  discountPctApplied: number
  mrpLineTotal: number
  discountAmount: number
  taxableAmount: number
  gstAmount: number
  lineNetAmount: number
  discountLabel: string
}

// ─── STEP 1: Patient ─────────────────────────────────────────────────────────

function StepPatient() {
  const { patient, prescription, setPatient, setPrescription, setStep } = useBillingStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [doctors, setDoctors] = useState<{ id: string; name: string; registrationNo: string }[]>([])

  useEffect(() => {
    fetch('/api/doctors?isActive=true')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Search failed')
      setResults(await res.json())
    } catch {
      toast.error('Failed to search patients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const selectPatient = (p: PatientResult) => {
    setPatient({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      patientCategory: p.patientCategory,
      hospitalPatientId: p.hospitalPatientId,
    })
    if (p.doctorId) {
      setPrescription({
        source: 'internal',
        doctorId: p.doctorId,
        doctorName: p.doctor?.name,
      })
    }
    setQuery('')
    setResults([])
  }

  const clearPatient = () => {
    setPatient(null)
    setPrescription({ source: 'external' })
  }

  const handleWalkIn = () => {
    setPatient({
      id: 'walkin-patient',
      name: 'Walk-in Patient',
      patientCategory: 'general',
    })
    // Stay on step 1 so the doctor/prescription fields are visible before proceeding
  }

  const canProceed = !!patient

  return (
    <div className="space-y-6">
      {/* Search */}
      {!patient && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-700">Search Patient</Label>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name or Hospital ID (e.g. HOS-0001)…"
          />

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="border rounded-lg divide-y overflow-hidden">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="text-xs text-slate-400 font-mono mr-2">
                      [{p.hospitalPatientId}]
                    </span>
                    <span className="font-medium text-slate-900">{p.name}</span>
                    {p.age && (
                      <span className="text-sm text-slate-500 ml-2">
                        {p.age}y{p.gender ? `, ${p.gender}` : ''}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={p.patientCategory} />
                </button>
              ))}
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              No patients found for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Selected patient card */}
      {patient && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{patient.name}</p>
                    <StatusBadge status={patient.patientCategory} />
                  </div>
                  {patient.hospitalPatientId && (
                    <p className="text-xs text-slate-500 font-mono">{patient.hospitalPatientId}</p>
                  )}
                  {patient.age && (
                    <p className="text-xs text-slate-500">
                      {patient.age}y{patient.gender ? `, ${patient.gender}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearPatient} className="text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor selector */}
      {patient && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Stethoscope className="w-4 h-4" />
            Doctor / Prescribing Physician
            <span className="text-red-500 ml-0.5">*</span>
            <span className="text-xs text-slate-400 font-normal ml-1">(required for Schedule H/H1 drugs)</span>
          </Label>
          <Select
            value={prescription?.doctorId ?? 'none'}
            onValueChange={(val) => {
              if (val === 'none') {
                setPrescription({ source: 'external', doctorId: undefined, doctorName: undefined, prescriptionNo: prescription?.prescriptionNo })
              } else {
                const doc = doctors.find((d) => d.id === val)
                setPrescription({ source: 'internal', doctorId: doc?.id, doctorName: doc?.name, prescriptionNo: prescription?.prescriptionNo })
              }
            }}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Select doctor…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No doctor / External prescription —</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  Dr. {d.name} ({d.registrationNo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prescription number */}
      {patient && (
        <div className="space-y-2">
          <Label htmlFor="prescriptionNo">Prescription Number (optional)</Label>
          <Input
            id="prescriptionNo"
            placeholder="e.g. RX-2024-00123"
            value={prescription?.prescriptionNo ?? ''}
            onChange={(e) =>
              setPrescription({
                source: prescription?.source ?? 'external',
                doctorId: prescription?.doctorId,
                doctorName: prescription?.doctorName,
                prescriptionNo: e.target.value,
              })
            }
            className="max-w-sm"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {!patient && (
          <Button variant="outline" onClick={handleWalkIn} className="gap-2">
            <UserX className="w-4 h-4" />
            Walk-in (No Patient)
          </Button>
        )}
        <Button
          disabled={!canProceed}
          onClick={() => setStep(2)}
          className="ml-auto"
        >
          Next: Add Drugs
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 2: Add Drugs ────────────────────────────────────────────────────────

function StepDrugs() {
  const { patient, prescription, items, addItem, removeItem, setStep } = useBillingStore()

  // Drug search
  const [drugQuery, setDrugQuery] = useState('')
  const [drugResults, setDrugResults] = useState<DrugResult[]>([])
  const [drugLoading, setDrugLoading] = useState(false)
  const drugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selected drug & batch form
  const [selectedDrug, setSelectedDrug] = useState<DrugResult | null>(null)
  const [batches, setBatches] = useState<BatchResult[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [preview, setPreview] = useState<DiscountPreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [addLoading, setAddLoading] = useState(false)

  const searchDrugs = useCallback(async (q: string) => {
    if (!q.trim()) { setDrugResults([]); return }
    setDrugLoading(true)
    try {
      const res = await fetch(`/api/drugs?search=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error()
      setDrugResults(await res.json())
    } catch {
      toast.error('Failed to search drugs')
    } finally {
      setDrugLoading(false)
    }
  }, [])

  useEffect(() => {
    if (drugDebounce.current) clearTimeout(drugDebounce.current)
    drugDebounce.current = setTimeout(() => searchDrugs(drugQuery), 300)
    return () => { if (drugDebounce.current) clearTimeout(drugDebounce.current) }
  }, [drugQuery, searchDrugs])

  const selectDrug = async (drug: DrugResult) => {
    setSelectedDrug(drug)
    setDrugQuery('')
    setDrugResults([])
    setSelectedBatchId('')
    setQuantity(1)
    setPreview(null)
    setBatchLoading(true)
    try {
      const res = await fetch(`/api/inventory/batches?drugId=${drug.id}&available=true`)
      if (!res.ok) throw new Error()
      const data: BatchResult[] = await res.json()
      setBatches(data)
      if (data.length > 0) setSelectedBatchId(data[0].id)
    } catch {
      toast.error('Failed to load batches')
    } finally {
      setBatchLoading(false)
    }
  }

  const fetchPreview = useCallback(async () => {
    if (!selectedDrug || !selectedBatchId || quantity < 1) { setPreview(null); return }
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/billing/discount-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientCategory: patient?.patientCategory ?? 'general',
          prescriptionSource: prescription?.source ?? 'internal',
          drugId: selectedDrug.id,
          batchId: selectedBatchId,
          quantity,
        }),
      })
      if (!res.ok) throw new Error()
      setPreview(await res.json())
    } catch {
      toast.error('Failed to fetch pricing preview')
    } finally {
      setPreviewLoading(false)
    }
  }, [selectedDrug, selectedBatchId, quantity, patient])

  useEffect(() => {
    const t = setTimeout(fetchPreview, 400)
    return () => clearTimeout(t)
  }, [fetchPreview])

  const selectedBatch = batches.find((b) => b.id === selectedBatchId)
  const maxQty = selectedBatch?.availableQty ?? 999

  const handleAddToCart = async () => {
    if (!selectedDrug || !selectedBatchId || !selectedBatch) return
    setAddLoading(true)
    try {
      let p = preview
      if (!p) {
        const res = await fetch('/api/billing/discount-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientCategory: patient?.patientCategory ?? 'general',
            prescriptionSource: prescription?.source ?? 'internal',
            drugId: selectedDrug.id,
            batchId: selectedBatchId,
            quantity,
          }),
        })
        if (!res.ok) throw new Error()
        p = await res.json()
      }

      const item: CartItem = {
        drugId: selectedDrug.id,
        batchId: selectedBatchId,
        drugName: selectedDrug.name,
        brandName: selectedDrug.brandName,
        schedule: selectedDrug.schedule,
        batchNo: selectedBatch.batchNo,
        expiryDate: selectedBatch.expiryDate,
        hsnCode: selectedBatch.hsnCode ?? '',
        quantity,
        mrpPerUnit: selectedBatch.mrpPerUnit,
        discountPctApplied: p?.discountPctApplied ?? 0,
        discountAmount: p?.discountAmount ?? 0,
        taxableAmount: p?.taxableAmount ?? selectedBatch.mrpPerUnit * quantity,
        gstRate: selectedDrug.gstRate,
        gstAmount: p?.gstAmount ?? 0,
        lineNetAmount: p?.lineNetAmount ?? selectedBatch.mrpPerUnit * quantity,
        discountLabel: p?.discountLabel ?? '',
      }
      addItem(item)
      toast.success(`${selectedDrug.name} added to bill`)
      setSelectedDrug(null)
      setBatches([])
      setSelectedBatchId('')
      setQuantity(1)
      setPreview(null)
    } catch {
      toast.error('Failed to add item')
    } finally {
      setAddLoading(false)
    }
  }

  // Totals
  const subtotal = items.reduce((a, i) => a + i.mrpPerUnit * i.quantity, 0)
  const totalDisc = items.reduce((a, i) => a + i.discountAmount, 0)
  const totalGst = items.reduce((a, i) => a + i.gstAmount, 0)
  const netTotal = items.reduce((a, i) => a + i.lineNetAmount, 0)

  return (
    <div className="space-y-6">
      {/* Drug search */}
      {!selectedDrug && (
        <div className="space-y-3">
          <Label>Search Drug / Barcode</Label>
          <SearchInput
            value={drugQuery}
            onChange={setDrugQuery}
            placeholder="Type drug name or scan barcode…"
          />
          {drugLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          )}
          {!drugLoading && drugResults.length > 0 && (
            <div className="border rounded-lg divide-y overflow-hidden max-h-60 overflow-y-auto">
              {drugResults.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDrug(d)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900">{d.name}</span>
                    {d.brandName && (
                      <span className="text-xs text-slate-400 ml-2">({d.brandName})</span>
                    )}
                  </div>
                  <ScheduleBadge schedule={d.schedule} />
                  <span className="text-xs text-slate-400">{d.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drug + batch form */}
      {selectedDrug && (
        <Card className="border-blue-200">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-slate-900">{selectedDrug.name}</span>
                {selectedDrug.brandName && (
                  <span className="text-sm text-slate-400">({selectedDrug.brandName})</span>
                )}
                <ScheduleBadge schedule={selectedDrug.schedule} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedDrug(null); setBatches([]); setPreview(null) }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {batchLoading && <Skeleton className="h-10 w-full" />}

            {!batchLoading && batches.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                No available batches for this drug.
              </p>
            )}

            {!batchLoading && batches.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="batch">Batch</Label>
                  <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                    <SelectTrigger id="batch">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batchNo} (Exp: {format(new Date(b.expiryDate), 'MMM yyyy')}) — Qty:{' '}
                          {b.availableQty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="qty">
                    Quantity
                    {selectedBatch && (
                      <span className="text-xs text-slate-400 ml-1">(max {maxQty})</span>
                    )}
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v) && v >= 1 && v <= maxQty) setQuantity(v)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Pricing preview */}
            {(previewLoading || preview) && selectedBatch && (
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm space-y-1.5">
                {previewLoading ? (
                  <Skeleton className="h-4 w-48" />
                ) : preview ? (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>MRP × {quantity}</span>
                      <span className="font-medium text-slate-900">{INR(selectedBatch.mrpPerUnit * quantity)}</span>
                    </div>
                    {preview.discountPctApplied > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Discount ({preview.discountPctApplied}% — {preview.discountLabel})</span>
                        <span className="font-medium">− {INR(preview.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span>Taxable Amount</span>
                      <span className="font-medium text-slate-900">{INR(preview.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>GST ({selectedDrug.gstRate}%)</span>
                      <span className="font-medium text-slate-900">{INR(preview.gstAmount)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Net Amount</span>
                      <span className="text-blue-700">{INR(preview.lineNetAmount)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {!batchLoading && batches.length > 0 && (
              <Button
                onClick={handleAddToCart}
                disabled={!selectedBatchId || quantity < 1 || addLoading}
                className="w-full gap-2"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Bill
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cart */}
      {items.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Cart ({items.length} item{items.length > 1 ? 's' : ''})</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Drug</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Disc%</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.drugId}-${item.batchId}`}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{item.drugName}</span>
                        <ScheduleBadge schedule={item.schedule} />
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono text-xs">{item.batchNo}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{INR(item.mrpPerUnit)}</TableCell>
                    <TableCell className="text-right text-green-700">
                      {item.discountPctApplied > 0 ? `${item.discountPctApplied}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{INR(item.lineNetAmount)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.drugId, item.batchId)}
                        className="text-slate-400 hover:text-red-500 p-1 h-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Running totals */}
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (MRP)</span>
              <span className="font-medium text-slate-900">{INR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Total Discount</span>
              <span className="font-medium">− {INR(totalDisc)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total GST</span>
              <span className="font-medium text-slate-900">{INR(totalGst)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-bold text-base text-slate-900">
              <span>Net Payable</span>
              <span className="text-blue-700">{INR(netTotal)}</span>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Pill}
          title="No items yet"
          description="Search and add drugs to the bill above."
        />
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => useBillingStore.getState().setStep(1)}>
          Back
        </Button>
        <Button
          disabled={items.length === 0}
          onClick={() => useBillingStore.getState().setStep(3)}
          className="ml-auto"
        >
          Next: Review
        </Button>
      </div>
    </div>
  )
}

// ─── STEP 3: Review ──────────────────────────────────────────────────────────

function StepReview() {
  const {
    patient,
    prescription,
    items,
    paymentMode,
    setPaymentMode,
    setStep,
  } = useBillingStore()

  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const subtotal = items.reduce((a, i) => a + i.mrpPerUnit * i.quantity, 0)
  const totalDisc = items.reduce((a, i) => a + i.discountAmount, 0)
  const totalGst = items.reduce((a, i) => a + i.gstAmount, 0)
  const netTotal = items.reduce((a, i) => a + i.lineNetAmount, 0)

  const scheduleHDrugs = items.filter(
    (i) => i.schedule?.toUpperCase() === 'H' || i.schedule?.toUpperCase() === 'H1'
  )
  const needsDoctor = scheduleHDrugs.length > 0 && !prescription?.doctorId

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const body = {
        patientId: patient?.id || undefined,
        prescriptionNo: prescription?.prescriptionNo,
        prescriptionSource: prescription?.source ?? 'external',
        doctorId: prescription?.doctorId,
        paymentMode,
        notes,
        items: items.map((i) => ({
          drugId: i.drugId,
          batchId: i.batchId,
          batchNo: i.batchNo,
          expiryDate: i.expiryDate,
          hsnCode: i.hsnCode ?? '',
          quantity: i.quantity,
          mrpPerUnit: i.mrpPerUnit,
          discountPctApplied: i.discountPctApplied,
          discountAmount: i.discountAmount,
          gstRate: i.gstRate,
          gstAmount: i.gstAmount,
          taxableAmount: i.taxableAmount,
          lineNetAmount: i.lineNetAmount,
          drugName: i.drugName,
          schedule: i.schedule,
        })),
      }
      const res = await fetch('/api/billing/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? err?.message ?? 'Failed to create bill')
      }
      const bill = await res.json()
      toast.success(`Bill ${bill.billNumber} created successfully`)
      useBillingStore.getState().reset()
      router.push(`/billing/${bill.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create bill'
      toast.error(message)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  const consequence = [
    `Billing ${items.length} drug${items.length > 1 ? 's' : ''} to ${patient?.name ?? 'Walk-in Patient'}.`,
    `Net amount: ${INR(netTotal)}.`,
    scheduleHDrugs.length > 0
      ? `Form 18 entries will be auto-created for ${scheduleHDrugs.length} Schedule H/H1 drug${scheduleHDrugs.length > 1 ? 's' : ''}.`
      : '',
    'This action cannot be undone.',
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="space-y-6">
      {/* Patient summary */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-900">{patient?.name ?? 'Walk-in Patient'}</span>
            <StatusBadge status={patient?.patientCategory ?? 'general'} />
          </div>
          {patient?.hospitalPatientId && (
            <p className="text-xs text-slate-500 font-mono ml-6">{patient.hospitalPatientId}</p>
          )}
          {prescription?.prescriptionNo && (
            <p className="text-sm text-slate-500 ml-6">Rx: {prescription.prescriptionNo}</p>
          )}
          {prescription?.doctorName && (
            <p className="text-sm text-slate-500 ml-6">Dr. {prescription.doctorName}</p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Drug</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">MRP/unit</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.drugId}-${item.batchId}`}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{item.drugName}</span>
                    <ScheduleBadge schedule={item.schedule} />
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{item.batchNo}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{INR(item.mrpPerUnit)}</TableCell>
                <TableCell className="text-right text-green-700">
                  {item.discountPctApplied > 0 ? `${item.discountPctApplied}%` : '—'}
                </TableCell>
                <TableCell className="text-right">{INR(item.gstAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{INR(item.lineNetAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm space-y-1.5 max-w-xs ml-auto">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal (MRP)</span>
          <span className="font-medium text-slate-900">{INR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>Total Discount</span>
          <span className="font-medium">− {INR(totalDisc)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Total GST</span>
          <span className="font-medium text-slate-900">{INR(totalGst)}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between font-bold text-base text-slate-900">
          <span>Net Payable</span>
          <span className="text-blue-700">{INR(netTotal)}</span>
        </div>
      </div>

      {/* Payment mode */}
      <div className="space-y-2">
        <Label>Payment Mode</Label>
        <div className="flex gap-2 flex-wrap">
          {(['cash', 'upi', 'card', 'credit'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMode(mode)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                paymentMode === mode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          placeholder="Any additional notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* H/H1 doctor guard */}
      {needsDoctor && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Doctor required for Schedule H/H1 items</p>
            <p className="mt-0.5 text-amber-700">
              Go back to Step 1 and select the prescribing doctor before confirming this bill.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={needsDoctor} className="ml-auto gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Confirm Bill
        </Button>
      </div>

      <ConfirmGate
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Bill"
        consequence={consequence}
        confirmLabel="Yes, Create Bill"
        onConfirm={handleConfirm}
        loading={submitting}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STEPS = ['Patient', 'Add Drugs', 'Review', 'Confirm']
const STEP_ICONS = [User, Pill, ClipboardList, CheckCircle2]

export default function BillingPOSPage() {
  const { step, reset } = useBillingStore()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="New Bill"
        subtitle="Pharmacy Point of Sale"
        breadcrumb={[
          { label: 'Billing', href: '/billing/history' },
          { label: 'New Bill' },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            Clear & Restart
          </Button>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-billing-pos"
        steps={[
          { title: 'Select Patient', description: 'Search by name or Hospital ID, or proceed as Walk-in' },
          { title: 'Add Drugs', description: 'Search drugs, pick batch and quantity — pricing auto-calculates' },
          { title: 'Review & Payment', description: 'Verify items, totals, GST and select payment mode' },
          { title: 'Confirm Bill', description: 'Submit bill; Form 18 auto-created for Schedule H/H1 drugs' },
        ]}
      />

      <StepWizard steps={STEPS} currentStep={step} />

      <Card>
        <CardContent className="pt-6">
          {step === 1 && <StepPatient />}
          {step === 2 && <StepDrugs />}
          {step === 3 && <StepReview />}
          {step === 4 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium text-slate-700">Bill submitted. Redirecting…</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

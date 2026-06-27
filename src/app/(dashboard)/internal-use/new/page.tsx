'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Trash2, Loader2, AlertTriangle, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmGate } from '@/components/shared/ConfirmGate'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const DEPT_OPTIONS = [
  { value: 'ot', label: 'OT (Operation Theatre)' },
  { value: 'general_ward', label: 'General Ward' },
  { value: 'icu', label: 'ICU' },
  { value: 'casualty', label: 'Casualty' },
  { value: 'pharmacy_own', label: 'Pharmacy Own Use' },
  { value: 'other', label: 'Other' },
]

const PURPOSE_OPTIONS = [
  { value: 'surgery', label: 'Surgery' },
  { value: 'dept_stock', label: 'Department Stock' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
]

interface CartItem {
  drugId: string
  batchId: string
  drugName: string
  schedule: string
  batchNo: string
  expiryDate: string
  quantityAvailable: number
  quantityIssued: number
}

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function ScheduleWarning({ items }: { items: CartItem[] }) {
  const flagged = items.filter((i) => {
    const s = i.schedule?.toUpperCase()
    return s === 'H' || s === 'H1'
  })
  if (flagged.length === 0) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold">Schedule H/H1 drugs included</p>
        <p className="text-amber-700 mt-0.5">
          {flagged.map((i) => i.drugName).join(', ')} — ensure surgeon prescription is on file.
        </p>
      </div>
    </div>
  )
}

export default function NewRequisitionPage() {
  const router = useRouter()
  const [department, setDepartment] = useState('')
  const [purpose, setPurpose] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<CartItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Drug search
  const [drugQuery, setDrugQuery] = useState('')
  const [drugResults, setDrugResults] = useState<any[]>([])
  const [drugLoading, setDrugLoading] = useState(false)
  const [selectedDrug, setSelectedDrug] = useState<any | null>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Doctors list
  const [doctors, setDoctors] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/doctors?isActive=true')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setDoctors(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const searchDrugs = useCallback(async (q: string) => {
    if (!q.trim()) { setDrugResults([]); return }
    setDrugLoading(true)
    try {
      const res = await fetch(`/api/drugs?search=${encodeURIComponent(q)}`)
      setDrugResults(res.ok ? await res.json() : [])
    } catch { setDrugResults([]) }
    finally { setDrugLoading(false) }
  }, [])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => searchDrugs(drugQuery), 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [drugQuery, searchDrugs])

  const selectDrug = async (drug: any) => {
    setSelectedDrug(drug)
    setDrugQuery('')
    setDrugResults([])
    setSelectedBatchId('')
    setQuantity(1)
    setBatchLoading(true)
    try {
      const res = await fetch(`/api/inventory/batches?drugId=${drug.id}&available=true`)
      const data = res.ok ? await res.json() : []
      setBatches(data)
      if (data.length > 0) setSelectedBatchId(data[0].id)
    } catch { setBatches([]) }
    finally { setBatchLoading(false) }
  }

  const selectedBatch = batches.find((b) => b.id === selectedBatchId)

  const addItem = () => {
    if (!selectedDrug || !selectedBatch || quantity < 1) return
    const existing = items.findIndex((i) => i.batchId === selectedBatchId)
    if (existing >= 0) {
      toast.error('This batch is already in the list')
      return
    }
    setItems((prev) => [
      ...prev,
      {
        drugId: selectedDrug.id,
        batchId: selectedBatch.id,
        drugName: selectedDrug.name,
        schedule: selectedDrug.schedule,
        batchNo: selectedBatch.batchNo,
        expiryDate: selectedBatch.expiryDate,
        quantityAvailable: selectedBatch.availableQty,
        quantityIssued: quantity,
      },
    ])
    setSelectedDrug(null)
    setBatches([])
    setSelectedBatchId('')
    setQuantity(1)
  }

  const updateQty = (batchId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.batchId === batchId ? { ...i, quantityIssued: Math.max(1, Math.min(qty, i.quantityAvailable)) } : i
      )
    )
  }

  const removeItem = (batchId: string) => setItems((prev) => prev.filter((i) => i.batchId !== batchId))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/internal-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          purpose,
          doctorId: doctorId || undefined,
          notes: notes || undefined,
          items: items.map((i) => ({ drugId: i.drugId, batchId: i.batchId, quantityIssued: i.quantityIssued })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to create requisition')
      }
      const ir = await res.json()
      toast.success(`Requisition ${ir.requisitionNumber} created`)
      router.push(`/internal-use/${ir.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  const canSubmit = department && purpose && items.length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="New Internal Requisition"
        subtitle="Issue drugs for hospital use — no billing generated"
        breadcrumb={[
          { label: 'Internal Use', href: '/internal-use' },
          { label: 'New Requisition' },
        ]}
      />

      <div className="space-y-6">
        {/* Header fields */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Department <span className="text-red-500">*</span></Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select department…" /></SelectTrigger>
                  <SelectContent>
                    {DEPT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Purpose <span className="text-red-500">*</span></Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger><SelectValue placeholder="Select purpose…" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Requesting Doctor (optional)</Label>
              <Select value={doctorId || 'none'} onValueChange={(v) => setDoctorId(v === 'none' ? '' : v)}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select doctor…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>Dr. {d.name} ({d.registrationNo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                className="w-full min-h-[72px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Surgeon name, patient details, any special instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Drug search + add */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <h3 className="font-semibold text-slate-700">Add Drugs</h3>

            {!selectedDrug ? (
              <div className="space-y-2">
                <SearchInput value={drugQuery} onChange={setDrugQuery} placeholder="Search drug name…" />
                {drugLoading && <Skeleton className="h-10 w-full" />}
                {!drugLoading && drugResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {drugResults.map((d: any) => (
                      <button
                        key={d.id}
                        onClick={() => selectDrug(d)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center gap-2"
                      >
                        <span className="font-medium">{d.name}</span>
                        {d.brandName && <span className="text-slate-400">({d.brandName})</span>}
                        <span className="ml-auto text-xs text-slate-400">{d.schedule?.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{selectedDrug.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedDrug(null); setBatches([]) }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {batchLoading && <Skeleton className="h-10 w-full" />}

                {!batchLoading && batches.length === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    No stock available for this drug.
                  </p>
                )}

                {!batchLoading && batches.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Batch</Label>
                      <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {batches.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.batchNo} (Exp: {format(new Date(b.expiryDate), 'MMM yyyy')}) — Qty: {b.availableQty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Quantity {selectedBatch && <span className="text-xs text-slate-400">(max {selectedBatch.availableQty})</span>}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedBatch?.availableQty ?? 999}
                        value={quantity}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!isNaN(v) && v >= 1) setQuantity(Math.min(v, selectedBatch?.availableQty ?? 999))
                        }}
                      />
                    </div>
                  </div>
                )}

                {!batchLoading && batches.length > 0 && (
                  <Button onClick={addItem} disabled={!selectedBatchId || quantity < 1} className="w-full gap-2">
                    <Plus className="w-4 h-4" /> Add Drug
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items table */}
        {items.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Drug</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Qty to Issue</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.batchId}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.drugName}</span>
                          {(item.schedule?.toUpperCase() === 'H' || item.schedule?.toUpperCase() === 'H1') && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              {item.schedule?.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{item.batchNo}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {format(new Date(item.expiryDate), 'MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.quantityAvailable}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={1}
                          max={item.quantityAvailable}
                          value={item.quantityIssued}
                          onChange={(e) => updateQty(item.batchId, parseInt(e.target.value, 10) || 1)}
                          className="w-20 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.batchId)}
                          className="text-slate-400 hover:text-red-500 p-1 h-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <ScheduleWarning items={items} />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push('/internal-use')}>Cancel</Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit} className="ml-auto gap-2">
            <Plus className="w-4 h-4" /> Create Draft Requisition
          </Button>
        </div>
      </div>

      <ConfirmGate
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create Internal Requisition"
        consequence={`Issuing ${items.length} drug line(s) to ${DEPT_OPTIONS.find((d) => d.value === department)?.label ?? department}.\n\nThe requisition will be saved as a draft. A manager or purchase pharmacist must approve it before stock is deducted.`}
        confirmLabel="Yes, Create Draft"
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </div>
  )
}

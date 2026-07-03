'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { computeBatchStatus } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleBanner } from '@/components/shared/LifecycleBanner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { toast } from 'sonner'

interface ManufacturerOption {
  id: string
  code: string
  name: string
}

interface DrugDiscountConfig {
  id: string
  discountApplicable: boolean
  bplDiscountPct: number
  generalDiscountPct: number
}

interface Drug {
  id: string
  name: string
  brandName: string | null
  manufacturer: string | null
  manufacturerId: string | null
  manufacturerRef: { id: string; code: string; name: string } | null
  category: string
  dosageForm: string
  strength: string | null
  packSize: string | null
  packUnit: string
  schedule: string
  hsnCode: string
  gstRate: number
  coldChainRequired: boolean
  coldChainMinTemp: number | null
  coldChainMaxTemp: number | null
  reorderLevel: number
  barcode: string | null
  notes: string | null
  isActive: boolean
  discountConfig: DrugDiscountConfig | null
  createdAt: string
  updatedAt: string
}

interface InventoryBatch {
  id: string
  batchNo: string
  mfgDate: string | null
  expiryDate: string
  quantityReceived: number
  quantityAvailable: number
  mrp: number
  isQuarantined: boolean
  quarantineReason: string | null
  drug: { reorderLevel: number }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}

function ManufacturerEdit({ drug, onSaved }: { drug: Drug; onSaved: (updated: Drug) => void }) {
  const [editing, setEditing] = useState(false)
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([])
  const [selectedId, setSelectedId] = useState(drug.manufacturerId ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing && manufacturers.length === 0) {
      fetch('/api/manufacturers').then(r => r.json()).then(setManufacturers).catch(() => {})
    }
  }, [editing, manufacturers.length])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/drugs/${drug.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturerId: selectedId || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      onSaved(updated)
      setEditing(false)
      toast.success('Manufacturer updated')
    } catch {
      toast.error('Failed to update manufacturer')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    const display = drug.manufacturerRef
      ? `${drug.manufacturerRef.code} — ${drug.manufacturerRef.name}`
      : drug.manufacturer ?? null
    return (
      <div className="flex items-center gap-2">
        <span className={display ? 'text-slate-900 text-sm' : 'text-slate-400 text-sm'}>
          {display ?? '—'}
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
          onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedId || '__none__'} onValueChange={(v) => setSelectedId(v === '__none__' ? '' : v)}>
        <SelectTrigger className="w-64 h-8 text-sm">
          <SelectValue placeholder="Select manufacturer…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— None —</SelectItem>
          {manufacturers.map(m => (
            <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button size="sm" variant="outline" className="h-8" onClick={() => {
        setSelectedId(drug.manufacturerId ?? '')
        setEditing(false)
      }}>
        Cancel
      </Button>
    </div>
  )
}

function DetailsTab({ drug, onRefresh }: { drug: Drug; onRefresh: (updated: Drug) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Identification</h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailRow label="Generic Name" value={drug.name} />
          <DetailRow label="Brand Name" value={drug.brandName} />
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Manufacturer</dt>
            <dd className="mt-1"><ManufacturerEdit drug={drug} onSaved={onRefresh} /></dd>
          </div>
          <DetailRow label="Category" value={drug.category} />
          <DetailRow label="Dosage Form" value={drug.dosageForm.replace(/_/g, ' ')} />
          <DetailRow label="Strength" value={drug.strength} />
          <DetailRow label="Pack Size" value={drug.packSize} />
          <DetailRow label="Pack Unit" value={drug.packUnit} />
          <DetailRow label="Barcode" value={drug.barcode} />
        </dl>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Regulatory & Tax</h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailRow label="Schedule" value={drug.schedule.toUpperCase()} />
          <DetailRow label="HSN Code" value={drug.hsnCode} />
          <DetailRow label="GST Rate" value={`${drug.gstRate}%`} />
          <DetailRow label="Reorder Level" value={`${drug.reorderLevel} units`} />
        </dl>
      </div>
      {drug.coldChainRequired && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Cold Chain</h3>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailRow label="Required" value="Yes" />
              <DetailRow
                label="Temperature Range"
                value={
                  drug.coldChainMinTemp != null && drug.coldChainMaxTemp != null
                    ? `${drug.coldChainMinTemp}°C – ${drug.coldChainMaxTemp}°C`
                    : null
                }
              />
            </dl>
          </div>
        </>
      )}
      {drug.notes && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line">{drug.notes}</p>
          </div>
        </>
      )}
      <Separator />
      <dl className="grid grid-cols-2 gap-4">
        <DetailRow label="Created" value={format(new Date(drug.createdAt), 'dd MMM yyyy')} />
        <DetailRow label="Last Updated" value={format(new Date(drug.updatedAt), 'dd MMM yyyy')} />
      </dl>
    </div>
  )
}


function DiscountTab({ drugId, config: initialConfig }: { drugId: string; config: DrugDiscountConfig | null }) {
  const [config, setConfig] = useState(initialConfig)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    discountApplicable: initialConfig?.discountApplicable ?? false,
    bplDiscountPct: initialConfig?.bplDiscountPct ?? 0,
    generalDiscountPct: initialConfig?.generalDiscountPct ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/drugs/${drugId}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountApplicable: form.discountApplicable,
          bplDiscountPct: Number(form.bplDiscountPct),
          generalDiscountPct: Number(form.generalDiscountPct),
        }),
      })
      if (!res.ok) throw new Error('Failed to save discount config')
      const updated = await res.json()
      setConfig(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setSaveError(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Discount configuration saved successfully.
        </div>
      )}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {!editing && config ? (
        <div className="space-y-4">
          <dl className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <dt className="text-sm text-slate-600">Discount Applicable</dt>
              <dd>
                <StatusBadge
                  status={config.discountApplicable ? 'active' : 'inactive'}
                  label={config.discountApplicable ? 'Yes' : 'No'}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <dt className="text-sm text-slate-600">BPL Discount %</dt>
              <dd className="text-sm font-medium text-slate-900">{config.bplDiscountPct}%</dd>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <dt className="text-sm text-slate-600">General Discount %</dt>
              <dd className="text-sm font-medium text-slate-900">{config.generalDiscountPct}%</dd>
            </div>
          </dl>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit Discount Config
          </Button>
        </div>
      ) : editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Discount Applicable</Label>
            <Select
              value={form.discountApplicable ? 'yes' : 'no'}
              onValueChange={(v) => setForm((f) => ({ ...f, discountApplicable: v === 'yes' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bplPct">BPL Discount %</Label>
            <Input
              id="bplPct"
              type="number"
              min={0}
              max={100}
              value={form.bplDiscountPct}
              onChange={(e) => setForm((f) => ({ ...f, bplDiscountPct: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="generalPct">General Discount %</Label>
            <Input
              id="generalPct"
              type="number"
              min={0}
              max={100}
              value={form.generalDiscountPct}
              onChange={(e) => setForm((f) => ({ ...f, generalDiscountPct: Number(e.target.value) }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false)
                if (config) {
                  setForm({
                    discountApplicable: config.discountApplicable,
                    bplDiscountPct: config.bplDiscountPct,
                    generalDiscountPct: config.generalDiscountPct,
                  })
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No discount configuration found.</p>
      )}
    </div>
  )
}

function BatchesTab({ drugId, reorderLevel }: { drugId: string; reorderLevel: number }) {
  const [batches, setBatches] = useState<InventoryBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quarantining, setQuarantining] = useState<string | null>(null)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inventory/batches?drugId=${drugId}`)
      if (!res.ok) throw new Error('Failed to fetch batches')
      const data = await res.json()
      setBatches(data)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [drugId])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const handleQuarantine = async (batchId: string, isQuarantined: boolean) => {
    setQuarantining(batchId)
    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, isQuarantined }),
      })
      if (!res.ok) throw new Error('Failed to update batch')
      await fetchBatches()
    } catch {
      // silently fail; user can retry
    } finally {
      setQuarantining(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Batch No</TableHead>
              <TableHead>Mfg Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>MRP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500">
                  No batches found for this drug.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => {
                const status = computeBatchStatus({
                  quantityAvailable: batch.quantityAvailable,
                  reorderLevel: batch.drug?.reorderLevel ?? reorderLevel,
                  expiryDate: new Date(batch.expiryDate),
                  isQuarantined: batch.isQuarantined,
                })
                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {batch.mfgDate ? format(new Date(batch.mfgDate), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">{batch.quantityReceived}</TableCell>
                    <TableCell className="text-sm">{batch.quantityAvailable}</TableCell>
                    <TableCell className="text-sm">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(batch.mrp)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      {batch.isQuarantined ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={quarantining === batch.id}
                          onClick={() => handleQuarantine(batch.id, false)}
                        >
                          {quarantining === batch.id ? 'Releasing…' : 'Release'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={quarantining === batch.id}
                          onClick={() => handleQuarantine(batch.id, true)}
                        >
                          {quarantining === batch.id ? 'Quarantining…' : 'Quarantine'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function DrugDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [drug, setDrug] = useState<Drug | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDrug() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/drugs/${id}`)
        if (!res.ok) throw new Error('Drug not found')
        const data = await res.json()
        setDrug(data)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load drug')
      } finally {
        setLoading(false)
      }
    }
    fetchDrug()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !drug) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? 'Drug not found'}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={drug.name}
        breadcrumb={[
          { label: 'Drugs', href: '/drugs' },
          { label: drug.name },
        ]}
      />

      <LifecycleBanner
        status={drug.isActive ? 'active' : 'inactive'}
        message={
          drug.isActive
            ? 'Drug is active and available for billing and purchasing.'
            : 'Drug is inactive and hidden from all searches.'
        }
      />

      <Tabs defaultValue="details">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="discount">Discount Config</TabsTrigger>
          <TabsTrigger value="batches">Stock & Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <DetailsTab drug={drug} onRefresh={(updated) => setDrug(updated as Drug)} />
          </div>
        </TabsContent>

        <TabsContent value="discount">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Discount Configuration</h2>
            <DiscountTab drugId={drug.id} config={drug.discountConfig} />
          </div>
        </TabsContent>

        <TabsContent value="batches">
          <BatchesTab drugId={drug.id} reorderLevel={drug.reorderLevel} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

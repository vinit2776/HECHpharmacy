'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ManufacturerOption {
  id: string
  code: string
  name: string
}

const DOSAGE_FORMS = [
  { value: 'eye_drop',     label: 'Eye Drop' },
  { value: 'eye_ointment', label: 'Eye Ointment' },
  { value: 'oral_tablet',  label: 'Oral Tablet' },
  { value: 'oral_syrup',   label: 'Oral Syrup' },
  { value: 'injection',    label: 'Injection' },
  { value: 'ointment',     label: 'Ointment' },
  { value: 'other',        label: 'Other' },
]

const PACK_UNITS = [
  { value: 'bottle', label: 'Bottle' },
  { value: 'strip',  label: 'Strip' },
  { value: 'vial',   label: 'Vial' },
  { value: 'tube',   label: 'Tube' },
  { value: 'box',    label: 'Box' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'unit',   label: 'Unit' },
]

const SCHEDULES = [
  { value: 'otc', label: 'OTC' },
  { value: 'g',   label: 'G' },
  { value: 'h',   label: 'H' },
  { value: 'h1',  label: 'H1' },
  { value: 'e1',  label: 'E1' },
]

const GST_RATES = [0, 5, 12, 18, 28]

interface FormState {
  name: string
  brandName: string
  manufacturerId: string
  category: string
  dosageForm: string
  strength: string
  packSize: string
  packUnit: string
  schedule: string
  hsnCode: string
  gstRate: number
  coldChainRequired: boolean
  coldChainMinTemp: string
  coldChainMaxTemp: string
  reorderLevel: number
  barcode: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  brandName: '',
  manufacturerId: '',
  category: '',
  dosageForm: 'eye_drop',
  strength: '',
  packSize: '',
  packUnit: 'bottle',
  schedule: 'h',
  hsnCode: '',
  gstRate: 12,
  coldChainRequired: false,
  coldChainMinTemp: '',
  coldChainMaxTemp: '',
  reorderLevel: 10,
  barcode: '',
  notes: '',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

export default function NewDrugPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([])

  useEffect(() => {
    fetch('/api/manufacturers')
      .then((r) => r.json())
      .then(setManufacturers)
      .catch(() => {})
  }, [])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload: Record<string, any> = {
      name:             form.name.trim(),
      brandName:        form.brandName.trim() || undefined,
      manufacturerId:   form.manufacturerId || undefined,
      category:         form.category.trim(),
      dosageForm:       form.dosageForm,
      strength:         form.strength.trim() || undefined,
      packSize:         form.packSize.trim() || undefined,
      packUnit:         form.packUnit,
      schedule:         form.schedule,
      hsnCode:          form.hsnCode.trim(),
      gstRate:          Number(form.gstRate),
      coldChainRequired: form.coldChainRequired,
      reorderLevel:     Number(form.reorderLevel),
      barcode:          form.barcode.trim() || undefined,
      notes:            form.notes.trim() || undefined,
    }

    if (form.coldChainRequired) {
      if (form.coldChainMinTemp) payload.coldChainMinTemp = Number(form.coldChainMinTemp)
      if (form.coldChainMaxTemp) payload.coldChainMaxTemp = Number(form.coldChainMaxTemp)
    }

    try {
      const res = await fetch('/api/drugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        const msg = data.issues
          ? data.issues.map((i: any) => i.message).join(', ')
          : (data.error ?? 'Failed to create drug')
        throw new Error(msg)
      }

      const drug = await res.json()
      router.push(`/drugs/${drug.id}`)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Drug"
        breadcrumb={[
          { label: 'Drugs', href: '/drugs' },
          { label: 'Add Drug' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Identification ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Identification</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Generic Name" required>
              <Input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Moxifloxacin"
                required
              />
            </Field>
            <Field label="Brand Name">
              <Input
                value={form.brandName}
                onChange={set('brandName')}
                placeholder="e.g. Moxicip"
              />
            </Field>
            <Field label="Manufacturer">
              <Select
                value={form.manufacturerId}
                onValueChange={(v) => setForm((f) => ({ ...f, manufacturerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer…" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Manage manufacturers at{' '}
                <a href="/drugs/manufacturers" className="text-blue-600 hover:underline">
                  Drugs → Manufacturers
                </a>
              </p>
            </Field>
            <Field label="Category" required>
              <Input
                value={form.category}
                onChange={set('category')}
                placeholder="e.g. Antibiotic Eye Drop"
                required
              />
            </Field>
            <Field label="Dosage Form" required>
              <Select
                value={form.dosageForm}
                onValueChange={(v) => setForm((f) => ({ ...f, dosageForm: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOSAGE_FORMS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Strength">
              <Input
                value={form.strength}
                onChange={set('strength')}
                placeholder="e.g. 0.5% w/v"
              />
            </Field>
            <Field label="Pack Size">
              <Input
                value={form.packSize}
                onChange={set('packSize')}
                placeholder="e.g. 5ml bottle"
              />
            </Field>
            <Field label="Pack Unit" required>
              <Select
                value={form.packUnit}
                onValueChange={(v) => setForm((f) => ({ ...f, packUnit: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACK_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Barcode">
              <Input
                value={form.barcode}
                onChange={set('barcode')}
                placeholder="Scan or type barcode"
              />
            </Field>
          </div>
        </div>

        <Separator />

        {/* ── Regulatory & Tax ───────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Regulatory &amp; Tax</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Schedule" required>
              <Select
                value={form.schedule}
                onValueChange={(v) => setForm((f) => ({ ...f, schedule: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="HSN Code" required>
              <Input
                value={form.hsnCode}
                onChange={set('hsnCode')}
                placeholder="e.g. 30049099"
                required
              />
            </Field>
            <Field label="GST Rate" required>
              <Select
                value={String(form.gstRate)}
                onValueChange={(v) => setForm((f) => ({ ...f, gstRate: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GST_RATES.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reorder Level (units)" required>
              <Input
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))}
              />
            </Field>
          </div>
        </div>

        <Separator />

        {/* ── Cold Chain ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Cold Chain</h2>
          <Field label="Cold Chain Required">
            <Select
              value={form.coldChainRequired ? 'yes' : 'no'}
              onValueChange={(v) => setForm((f) => ({ ...f, coldChainRequired: v === 'yes' }))}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.coldChainRequired && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min Temperature (°C)">
                <Input
                  type="number"
                  value={form.coldChainMinTemp}
                  onChange={set('coldChainMinTemp')}
                  placeholder="e.g. 2"
                />
              </Field>
              <Field label="Max Temperature (°C)">
                <Input
                  type="number"
                  value={form.coldChainMaxTemp}
                  onChange={set('coldChainMaxTemp')}
                  placeholder="e.g. 8"
                />
              </Field>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Notes</h2>
          <textarea
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Any additional notes about this drug…"
          />
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-8">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add Drug'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/drugs')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleBanner } from '@/components/shared/LifecycleBanner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

interface Patient {
  id: string
  name: string
  hospitalPatientId: string | null
  age: number | null
  gender: string | null
  phone: string | null
  address: string | null
  patientCategory: string
  bplCardNo: string | null
  isActive: boolean
  doctor: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

interface Bill {
  id: string
  billNumber: string
  billDate: string
  netAmount: number
  totalDiscountAmount: number
  status: string
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

function PatientInfoSection({ patient }: { patient: Patient }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: patient.name,
    hospitalPatientId: patient.hospitalPatientId ?? '',
    age: patient.age != null ? String(patient.age) : '',
    gender: patient.gender ?? 'male',
    phone: patient.phone ?? '',
    address: patient.address ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          hospitalPatientId: form.hospitalPatientId || undefined,
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to save')
      }
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
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800">Patient Information</h2>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
          Patient information saved.
        </div>
      )}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {saveError}
        </div>
      )}

      {!editing ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ReadField label="Name" value={patient.name} />
          <ReadField label="Hospital ID" value={patient.hospitalPatientId} />
          <ReadField label="Age" value={patient.age != null ? `${patient.age} yrs` : null} />
          <ReadField label="Gender" value={patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null} />
          <ReadField label="Phone" value={patient.phone} />
          <ReadField label="Category">
            <StatusBadge status={patient.patientCategory} />
          </ReadField>
          {patient.patientCategory === 'bpl' && (
            <ReadField label="BPL Card No" value={patient.bplCardNo} />
          )}
          {patient.doctor && (
            <ReadField label="Assigned Doctor" value={patient.doctor.name} />
          )}
          <ReadField label="Address" value={patient.address} />
          <ReadField label="Registered On" value={format(new Date(patient.createdAt), 'dd MMM yyyy')} />
        </dl>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="pi-name">Name</Label>
            <Input
              id="pi-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-hid">Hospital Patient ID</Label>
            <Input
              id="pi-hid"
              value={form.hospitalPatientId}
              onChange={(e) => setForm((f) => ({ ...f, hospitalPatientId: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-phone">Phone</Label>
            <Input
              id="pi-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-age">Age</Label>
            <Input
              id="pi-age"
              type="number"
              min={0}
              max={150}
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="pi-address">Address</Label>
            <Input
              id="pi-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2 mt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReadField({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">
        {children ?? (value != null && value !== '' ? value : <span className="text-slate-400">—</span>)}
      </dd>
    </div>
  )
}

function BillHistorySection({ patientId }: { patientId: string }) {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/billing/bills`)
      if (!res.ok) throw new Error('Failed to fetch bills')
      const data: (Bill & { patient?: { id: string } })[] = await res.json()
      // Filter by patient
      setBills(data.filter((b) => b.patient?.id === patientId || (b as any).patientId === patientId))
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">Bill History</h2>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Date</TableHead>
            <TableHead>Bill No</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : bills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-sm text-slate-500">
                No bills found for this patient.
              </TableCell>
            </TableRow>
          ) : (
            bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="text-sm text-slate-600">
                  {format(new Date(bill.billDate), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="font-mono text-sm">{bill.billNumber}</TableCell>
                <TableCell className="text-sm font-medium">{formatINR(bill.netAmount)}</TableCell>
                <TableCell className="text-sm text-slate-600">{formatINR(bill.totalDiscountAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={bill.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function getBannerStatus(patient: Patient): { status: string; message: string } {
  if (!patient.isActive) {
    return { status: 'inactive', message: 'This patient is inactive and will not appear in billing searches.' }
  }
  if (patient.patientCategory === 'bpl') {
    return { status: 'active', message: 'Active BPL patient — eligible for BPL discount rates.' }
  }
  return { status: 'active', message: 'Active General patient.' }
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPatient() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/patients/${id}`)
        if (!res.ok) throw new Error('Patient not found')
        const data = await res.json()
        setPatient(data)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load patient')
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? 'Patient not found'}
      </div>
    )
  }

  const { status, message } = getBannerStatus(patient)
  const bannerStatusLabel = !patient.isActive
    ? 'INACTIVE'
    : patient.patientCategory === 'bpl'
    ? 'ACTIVE — BPL'
    : 'ACTIVE — GENERAL'

  return (
    <div>
      <PageHeader
        title={patient.name}
        breadcrumb={[
          { label: 'Patients', href: '/patients' },
          { label: patient.name },
        ]}
      />

      <LifecycleBanner
        status={status}
        statusLabel={bannerStatusLabel}
        message={message}
      />

      <PatientInfoSection patient={patient} />
      <BillHistorySection patientId={patient.id} />
    </div>
  )
}

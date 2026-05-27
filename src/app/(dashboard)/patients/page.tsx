'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  patientCategory: string
  phone: string | null
  isActive: boolean
  updatedAt: string
}

const defaultForm = {
  name: '',
  hospitalPatientId: '',
  age: '',
  gender: 'male',
  phone: '',
  address: '',
  patientCategory: 'general',
  bplCardNo: '',
  doctorId: '',
}

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/patients?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch patients')
      const data: Patient[] = await res.json()
      const filtered = categoryFilter === 'all'
        ? data
        : data.filter((p) => p.patientCategory === categoryFilter)
      setPatients(filtered)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300)
    return () => clearTimeout(timer)
  }, [fetchPatients])

  const handleRegister = async () => {
    if (!form.name.trim()) {
      setFormError('Patient name is required')
      return
    }
    if (form.patientCategory === 'bpl' && !form.bplCardNo.trim()) {
      setFormError('BPL card number is required for BPL patients')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          hospitalPatientId: form.hospitalPatientId || undefined,
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          patientCategory: form.patientCategory,
          bplCardNo: form.bplCardNo || undefined,
          doctorId: form.doctorId || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to register patient')
      }
      const created = await res.json()
      setDialogOpen(false)
      setForm(defaultForm)
      router.push(`/patients/${created.id}`)
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to register patient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        action={
          <Button onClick={() => { setForm(defaultForm); setFormError(null); setDialogOpen(true) }}>
            + Register Patient
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, hospital ID, or phone…"
          className="w-80"
          helperText="Search by name, hospital ID, or phone number"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="bpl">BPL</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Hospital ID</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No patients found"
                    description="Register your first patient to get started"
                    actionLabel="Register Patient"
                    onAction={() => { setForm(defaultForm); setFormError(null); setDialogOpen(true) }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <TableCell className="font-medium text-slate-900">{patient.name}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-600">
                    {patient.hospitalPatientId ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {patient.age != null ? `${patient.age} yrs` : '—'}
                  </TableCell>
                  <TableCell className="capitalize text-slate-600">{patient.gender ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={patient.patientCategory} />
                  </TableCell>
                  <TableCell className="text-slate-600">{patient.phone ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={patient.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="p-name">Name *</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-hid">Hospital Patient ID</Label>
                <Input
                  id="p-hid"
                  value={form.hospitalPatientId}
                  onChange={(e) => setForm((f) => ({ ...f, hospitalPatientId: e.target.value }))}
                  placeholder="HCEH-XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Phone</Label>
                <Input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-age">Age</Label>
                <Input
                  id="p-age"
                  type="number"
                  min={0}
                  max={150}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  placeholder="Years"
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
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.patientCategory}
                  onValueChange={(v) => setForm((f) => ({ ...f, patientCategory: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bpl">BPL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.patientCategory === 'bpl' && (
                <div className="space-y-2">
                  <Label htmlFor="p-bpl">BPL Card No *</Label>
                  <Input
                    id="p-bpl"
                    value={form.bplCardNo}
                    onChange={(e) => setForm((f) => ({ ...f, bplCardNo: e.target.value }))}
                    placeholder="BPL card number"
                  />
                </div>
              )}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="p-address">Address</Label>
                <Input
                  id="p-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={saving}>
              {saving ? 'Registering…' : 'Register Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

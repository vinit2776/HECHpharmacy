'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stethoscope } from 'lucide-react'
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

interface Doctor {
  id: string
  name: string
  registrationNo: string
  specialisation: string
  type: string
  phone: string | null
  isActive: boolean
}

const defaultForm = {
  name: '',
  registrationNo: '',
  specialisation: 'Ophthalmology',
  type: 'internal',
  phone: '',
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/doctors?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch doctors')
      const data = await res.json()
      setDoctors(data)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    const timer = setTimeout(fetchDoctors, 300)
    return () => clearTimeout(timer)
  }, [fetchDoctors])

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setFormError('Doctor name is required')
      return
    }
    if (!form.registrationNo.trim()) {
      setFormError('Registration number is required')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          registrationNo: form.registrationNo,
          specialisation: form.specialisation || 'Ophthalmology',
          type: form.type,
          phone: form.phone || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to create doctor')
      }
      setDialogOpen(false)
      setForm(defaultForm)
      fetchDoctors()
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create doctor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Doctors"
        action={
          <Button onClick={() => { setForm(defaultForm); setFormError(null); setDialogOpen(true) }}>
            + Add Doctor
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search doctors…"
          className="w-72"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="external">External</SelectItem>
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
              <TableHead>Reg No</TableHead>
              <TableHead>Specialisation</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : doctors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Stethoscope}
                    title="No doctors found"
                    description="Add your first doctor to get started"
                  />
                </TableCell>
              </TableRow>
            ) : (
              doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium text-slate-900">{doctor.name}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-600">{doctor.registrationNo}</TableCell>
                  <TableCell className="text-slate-600">{doctor.specialisation}</TableCell>
                  <TableCell>
                    <span className="capitalize text-slate-600">{doctor.type}</span>
                  </TableCell>
                  <TableCell className="text-slate-600">{doctor.phone ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={doctor.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Doctor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="d-name">Name *</Label>
              <Input
                id="d-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Dr. Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-regno">Registration No *</Label>
              <Input
                id="d-regno"
                value={form.registrationNo}
                onChange={(e) => setForm((f) => ({ ...f, registrationNo: e.target.value }))}
                placeholder="MCI/SMC registration number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-spec">Specialisation</Label>
              <Input
                id="d-spec"
                value={form.specialisation}
                onChange={(e) => setForm((f) => ({ ...f, specialisation: e.target.value }))}
                placeholder="Ophthalmology"
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-phone">Phone</Label>
              <Input
                id="d-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setForm((f) => ({ ...f, phone: digits }))
                }}
                placeholder="10-digit mobile number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding…' : 'Add Doctor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

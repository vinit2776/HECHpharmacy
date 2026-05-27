'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
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

interface Supplier {
  id: string
  name: string
  type: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  drugLicenseNo: string | null
  paymentTermsDays: number
  isActive: boolean
}

const defaultForm = {
  name: '',
  type: 'distributor',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  drugLicenseNo: '',
  paymentTermsDays: 30,
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/suppliers?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      const data = await res.json()
      setSuppliers(data)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(fetchSuppliers, 300)
    return () => clearTimeout(timer)
  }, [fetchSuppliers])

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setFormError('Supplier name is required')
      return
    }
    if (!form.type) {
      setFormError('Type is required')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          contactPerson: form.contactPerson || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          gstin: form.gstin || undefined,
          drugLicenseNo: form.drugLicenseNo || undefined,
          paymentTermsDays: Number(form.paymentTermsDays),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to create supplier')
      }
      setDialogOpen(false)
      setForm(defaultForm)
      fetchSuppliers()
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create supplier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        action={
          <Button onClick={() => { setForm(defaultForm); setFormError(null); setDialogOpen(true) }}>
            + Add Supplier
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers…"
          className="w-72"
        />
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
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Drug License No</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Building2}
                    title="No suppliers found"
                    description="Add your first supplier to get started"
                  />
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => router.push(`/suppliers/${supplier.id}`)}
                >
                  <TableCell className="font-medium text-slate-900">{supplier.name}</TableCell>
                  <TableCell className="capitalize text-slate-600">{supplier.type}</TableCell>
                  <TableCell className="text-slate-600">{supplier.contactPerson ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{supplier.phone ?? '—'}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-600">{supplier.drugLicenseNo ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{supplier.paymentTermsDays} days</TableCell>
                  <TableCell>
                    <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
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
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="s-name">Name *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-contact">Contact Person</Label>
                <Input
                  id="s-contact"
                  value={form.contactPerson}
                  onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-phone">Phone</Label>
                <Input
                  id="s-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="s-address">Address</Label>
                <Input
                  id="s-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-gstin">GSTIN</Label>
                <Input
                  id="s-gstin"
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-dlno">Drug License No</Label>
                <Input
                  id="s-dlno"
                  value={form.drugLicenseNo}
                  onChange={(e) => setForm((f) => ({ ...f, drugLicenseNo: e.target.value }))}
                  placeholder="DL-XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-payment">Payment Terms (days)</Label>
                <Input
                  id="s-payment"
                  type="number"
                  min={0}
                  value={form.paymentTermsDays}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding…' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

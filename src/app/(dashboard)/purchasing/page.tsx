'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Package, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function PurchasingPage() {
  const router = useRouter()
  const [grns, setGrns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    fetch(`/api/purchasing/grns?${params}`)
      .then((r) => r.json())
      .then((d) => setGrns(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, status])

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

  return (
    <div>
      <PageHeader
        title="Purchases"
        action={
          <Button onClick={() => router.push('/purchasing/new')}>
            <Plus className="w-4 h-4 mr-2" /> New Purchase
          </Button>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-purchasing"
        steps={[
          {
            title: 'New Purchase (GRN)',
            description: 'Click "New Purchase" to start recording a supplier delivery',
          },
          {
            title: 'Add Drug Items',
            description: 'For each drug received, add batch number, expiry date, quantity and rate',
          },
          {
            title: 'Confirm GRN',
            description: 'Confirming locks the record and updates inventory stock levels',
          },
          {
            title: 'Purchase Return',
            description: 'If items are defective or wrong, process via Purchase Returns menu',
          },
        ]}
      />

      <div className="flex gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search supplier or invoice no…"
          className="flex-1 max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : grns.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No purchases recorded"
          description="Start by recording your first stock receipt from a supplier."
          actionLabel="Record Purchase (GRN)"
          onAction={() => router.push('/purchasing/new')}
        />
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.map((grn) => (
                <TableRow key={grn.id} className="cursor-pointer hover:bg-slate-50">
                  <TableCell className="font-mono text-sm">{grn.grnNumber}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(grn.receivedDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{grn.supplier?.name}</TableCell>
                  <TableCell className="text-sm text-slate-600">{grn.supplierInvoiceNo}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(grn.netPayable))}</TableCell>
                  <TableCell>
                    <StatusBadge status={grn.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={grn.status === 'draft' ? 'default' : 'outline'}
                      onClick={() => router.push(`/purchasing/${grn.id}`)}
                    >
                      {grn.status === 'draft' ? 'Continue' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

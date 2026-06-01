'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Receipt, Eye, Plus, Loader2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
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
import { Skeleton } from '@/components/ui/skeleton'

// ─── helpers ─────────────────────────────────────────────────────────────────

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function paymentModeLabel(mode: string) {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

// ─── types ───────────────────────────────────────────────────────────────────

interface BillSummary {
  id: string
  billNumber: string
  createdAt: string
  patient?: {
    name: string
    hospitalPatientId?: string
  }
  netAmount: number
  paymentMode: string
  status: 'active' | 'cancelled' | 'returned'
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function BillingHistoryPage() {
  const router = useRouter()

  const [bills, setBills] = useState<BillSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'returned'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchBills = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/billing/bills?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load bills')
      setBills(await res.json())
    } catch {
      toast.error('Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, dateFrom, dateTo])

  // Debounce search; immediate trigger on filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchBills, search ? 400 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchBills, search])

  const isEmpty = !loading && bills.length === 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title="Billing History"
        subtitle="All pharmacy bills"
        breadcrumb={[{ label: 'Billing', href: '/billing/history' }, { label: 'History' }]}
        action={
          <Button onClick={() => router.push('/billing')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Bill
          </Button>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-billing-history"
        steps={[
          {
            title: 'Create Bill',
            description: 'Go to Billing (New Bill) to generate a bill for a patient or walk-in',
          },
          {
            title: 'Bill Confirmed',
            description: 'Once submitted, the bill is immutable and assigned a bill number',
          },
          {
            title: 'View & Print',
            description: 'Open any bill to print the receipt or download as PDF',
          },
          {
            title: 'Sales Returns',
            description: 'If a patient returns drugs, process via the Sales Returns menu',
          },
        ]}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="sm:col-span-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Bill no. or patient name…"
          />
        </div>

        <div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'cancelled' | 'returned')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Receipt}
          title="No bills found"
          description={
            search || statusFilter !== 'all' || dateFrom || dateTo
              ? 'No bills match your current filters. Try adjusting your search.'
              : 'No bills have been created yet.'
          }
          actionLabel="Create First Bill"
          onAction={() => router.push('/billing')}
        />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Bill No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow
                  key={bill.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => router.push(`/billing/${bill.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium text-blue-700">
                    {bill.billNumber}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {format(new Date(bill.createdAt), 'dd MMM yyyy')}
                    <span className="block text-xs text-slate-400">
                      {format(new Date(bill.createdAt), 'hh:mm a')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {bill.patient ? (
                      <div>
                        <p className="font-medium text-slate-900">{bill.patient.name}</p>
                        {bill.patient.hospitalPatientId && (
                          <p className="text-xs text-slate-400 font-mono">
                            {bill.patient.hospitalPatientId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">Walk-in</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {paymentModeLabel(bill.paymentMode)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {INR(bill.netAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={bill.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/billing/${bill.id}`)
                      }}
                      className="gap-1 text-slate-500 hover:text-blue-600"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-400">
            {bills.length} bill{bills.length !== 1 ? 's' : ''} found
          </div>
        </div>
      )}
    </div>
  )
}

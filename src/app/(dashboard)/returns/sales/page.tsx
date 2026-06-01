'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

interface SalesReturn {
  id: string
  returnNumber: string
  createdAt: string
  status: string
  returnReason: string
  originalBill: {
    billNumber: string
    patient: { name: string }
  }
  items: { id: string; drugName: string; quantity: number; billItemId: string }[]
  totalRefundAmount: number
}

interface BillItem {
  id: string
  drugId: string
  batchId: string
  drugName: string
  quantity: number
  mrpPerUnit: number
  discountPct: number
  lineNetAmount: number   // actual amount paid incl. GST — used for refund calculation
}

interface Bill {
  id: string
  billNumber: string
  createdAt: string
  patient: { name: string }
  items: BillItem[]
}

function InitiateReturnDialog({
  open,
  onOpenChange,
  prefillBillId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  prefillBillId?: string | null
  onSuccess: () => void
}) {
  const [billSearch, setBillSearch] = useState('')
  const [bill, setBill] = useState<Bill | null>(null)
  const [billLoading, setBillLoading] = useState(false)
  const [billError, setBillError] = useState('')
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})
  const [itemReasons, setItemReasons] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // When dialog opens with a prefill bill id, fetch it immediately
  useEffect(() => {
    if (open && prefillBillId) {
      setBillSearch(prefillBillId)
      searchBill(prefillBillId)
    }
    if (!open) {
      // reset
      setBillSearch('')
      setBill(null)
      setBillError('')
      setReturnQtys({})
      setItemReasons({})
      setReason('')
    }
  }, [open, prefillBillId])

  async function fetchBillById(id: string): Promise<Bill | null> {
    const res = await fetch(`/api/billing/bills/${id}`)
    if (!res.ok) return null
    return res.json()
  }

  async function searchBill(query: string) {
    if (!query.trim()) return
    setBillLoading(true)
    setBillError('')
    setBill(null)
    try {
      let found: Bill | null = null

      // If query looks like a UUID (prefillBillId), fetch detail directly
      const isUuid = /^[0-9a-f-]{36}$/i.test(query.trim())
      if (isUuid) {
        found = await fetchBillById(query.trim())
      } else {
        // Search by bill number, then fetch detail for items
        const params = new URLSearchParams({ search: query.trim() })
        const res = await fetch(`/api/billing/bills?${params}`)
        const data = await res.json()
        const stub = Array.isArray(data) ? data[0] : null
        if (stub?.id) {
          found = await fetchBillById(stub.id)
        }
      }

      if (!found) {
        setBillError('No bill found with that number.')
      } else {
        setBill(found)
        const qtys: Record<string, number> = {}
        found.items.forEach((item) => { qtys[item.id] = 0 })
        setReturnQtys(qtys)
      }
    } catch {
      setBillError('Failed to fetch bill. Please try again.')
    } finally {
      setBillLoading(false)
    }
  }

  async function handleSubmit() {
    if (!bill) return
    if (!reason.trim()) {
      toast.error('Please provide a reason for the return.')
      return
    }
    const items = bill.items
      .filter((item) => (returnQtys[item.id] ?? 0) > 0)
      .map((item) => {
        const qty = returnQtys[item.id]
        // Refund = proportional share of the actual line net amount (incl. GST + discount)
        const perUnitNet = item.lineNetAmount / item.quantity
        const refundAmount = qty * perUnitNet
        return {
          billItemId: item.id,
          drugId: item.drugId,
          batchId: item.batchId,
          quantityReturned: qty,
          refundAmount: Math.round(refundAmount * 100) / 100,
          returnToStock: true,
        }
      })
    if (items.length === 0) {
      toast.error('Please enter a return quantity for at least one item.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/returns/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalBillId: bill.id, returnReason: reason, items }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message ?? 'Failed to initiate return.')
      }
      toast.success('Sales return initiated successfully.')
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Initiate Sales Return</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Bill search */}
          <div className="space-y-1">
            <Label>Bill Number</Label>
            <div className="flex gap-2">
              <Input
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="e.g. BILL-0001"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchBill(billSearch)
                }}
                onBlur={() => searchBill(billSearch)}
              />
              <Button variant="outline" onClick={() => searchBill(billSearch)} disabled={billLoading}>
                {billLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {billError && <p className="text-xs text-red-600">{billError}</p>}
          </div>

          {/* Bill details */}
          {bill && (
            <>
              <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill No</span>
                  <span className="font-mono font-medium">{bill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient</span>
                  <span className="font-medium">{bill.patient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Date</span>
                  <span>{format(new Date(bill.createdAt), 'dd MMM yyyy')}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1">
                <Label>Return Items</Label>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Drug</TableHead>
                        <TableHead className="text-right">Billed Qty</TableHead>
                        <TableHead className="text-right w-32">Return Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bill.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.drugName}</TableCell>
                          <TableCell className="text-right text-slate-600">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={returnQtys[item.id] ?? 0}
                              onChange={(e) =>
                                setReturnQtys((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(
                                    Number(e.target.value),
                                    item.quantity
                                  ),
                                }))
                              }
                              className="w-24 text-right ml-auto"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <Label>
                  Reason <span className="text-red-500">*</span>
                </Label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the reason for return…"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !bill || !reason.trim()}>
            {submitting ? 'Submitting…' : 'Initiate Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (rejectionReason: string) => Promise<void>
}) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) setRejectionReason('')
  }, [open])

  async function handleConfirm() {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.')
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(rejectionReason)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Return</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>
            Rejection Reason <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this return is being rejected…"
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting || !rejectionReason.trim()}>
            {submitting ? 'Rejecting…' : 'Reject Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SalesReturnsPage() {
  const searchParams = useSearchParams()
  const prefillBillId = searchParams.get('billId')

  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const [showInitiate, setShowInitiate] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/returns/sales')
      const data = await res.json()
      setReturns(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load sales returns.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReturns()
    // Check session role
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user?.role === 'manager' || session?.user?.role === 'admin') {
          setIsManager(true)
        }
      })
      .catch(() => {})
  }, [fetchReturns])

  // If prefillBillId is present on mount, open the dialog
  useEffect(() => {
    if (prefillBillId) {
      setShowInitiate(true)
    }
  }, [prefillBillId])

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/returns/sales/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve.')
      toast.success('Return approved.')
      await fetchReturns()
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string, rejectionReason: string) {
    const res = await fetch(`/api/returns/sales/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'reject', rejectionReason }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message ?? 'Failed to reject.')
    }
    toast.success('Return rejected.')
    await fetchReturns()
  }

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        subtitle="Manage patient / OTC bill returns and refunds"
        action={
          <Button onClick={() => setShowInitiate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Initiate Return
          </Button>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-sales-returns"
        steps={[
          {
            title: 'Find Original Bill',
            description: 'Search by bill number or patient name to locate the sale to be reversed',
          },
          {
            title: 'Select Return Items',
            description: 'Choose which drugs (and quantities) the patient is returning',
          },
          {
            title: 'Verify & Approve',
            description: 'Review the return amount; Schedule H/H1 drug returns require extra care',
          },
          {
            title: 'Stock Restored',
            description: 'Approved returns add the returned quantity back to inventory automatically',
          },
        ]}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : returns.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No sales returns"
          description="No return requests have been recorded yet."
          actionLabel="Initiate Return"
          onAction={() => setShowInitiate(true)}
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Bill No</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((ret) => (
                <TableRow key={ret.id}>
                  <TableCell className="font-mono text-sm">{ret.returnNumber}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {format(new Date(ret.createdAt), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{ret.originalBill?.billNumber}</TableCell>
                  <TableCell className="font-medium">{ret.originalBill?.patient?.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(Number(ret.totalRefundAmount ?? 0))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ret.status} />
                  </TableCell>
                  <TableCell>
                    {ret.status === 'pending_approval' && isManager && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          disabled={actionLoading === ret.id}
                          onClick={() => handleApprove(ret.id)}
                        >
                          {actionLoading === ret.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={actionLoading === ret.id}
                          onClick={() => setRejectTarget(ret.id)}
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {ret.status === 'pending_approval' && !isManager && (
                      <span className="text-xs text-slate-400">Awaiting approval</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InitiateReturnDialog
        open={showInitiate}
        onOpenChange={setShowInitiate}
        prefillBillId={prefillBillId}
        onSuccess={fetchReturns}
      />

      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={(v) => { if (!v) setRejectTarget(null) }}
        onConfirm={async (rejectionReason) => {
          if (!rejectTarget) return
          await handleReject(rejectTarget, rejectionReason)
          setRejectTarget(null)
        }}
      />
    </div>
  )
}

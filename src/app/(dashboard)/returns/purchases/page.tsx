'use client'

import { useEffect, useState, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

interface PurchaseReturn {
  id: string
  returnNumber: string
  createdAt: string
  status: string
  returnReason: string
  originalGrn: {
    grnNumber: string
    supplier: { name: string }
  }
  totalReturnAmount: number
}

interface GRN {
  id: string
  grnNumber: string
  receivedDate: string
  supplierId: string
  supplier: { name: string }
  supplierInvoiceNo: string
}

interface GRNItem {
  id: string
  drugId: string
  batchNo: string
  drug: { name: string; brandName?: string }
  quantity: number
  purchaseRatePerUnit: number
  // resolved from inventoryBatches
  batchId?: string
  availableQty?: number
}

const RETURN_REASONS: { value: string; label: string }[] = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'short_expiry', label: 'Short Expiry' },
  { value: 'quality', label: 'Quality Issue' },
  { value: 'excess', label: 'Excess Stock' },
]

function InitiatePurchaseReturnDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [grnSearch, setGrnSearch] = useState('')
  const [grn, setGrn] = useState<GRN | null>(null)
  const [grnLoading, setGrnLoading] = useState(false)
  const [grnError, setGrnError] = useState('')
  const [grnItems, setGrnItems] = useState<GRNItem[]>([])
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setGrnSearch('')
      setGrn(null)
      setGrnError('')
      setGrnItems([])
      setReturnQtys({})
      setReason('')
    }
  }, [open])

  async function searchGrn(query: string) {
    if (!query.trim()) return
    setGrnLoading(true)
    setGrnError('')
    setGrn(null)
    setGrnItems([])
    setReturnQtys({})
    try {
      const params = new URLSearchParams({ search: query.trim() })
      const res = await fetch(`/api/purchasing/grns?${params}`)
      const data = await res.json()
      const found: GRN | undefined = Array.isArray(data) ? data[0] : data?.grns?.[0]
      if (!found) {
        setGrnError('No GRN found with that number.')
        return
      }
      setGrn(found)

      // Fetch GRN detail to get items + inventory batches
      const detailRes = await fetch(`/api/purchasing/grns/${found.id}`)
      if (detailRes.ok) {
        const detail = await detailRes.json()
        // Build a batchNo → batchId + availableQty map from inventoryBatches
        const batchMap: Record<string, { id: string; qty: number }> = {}
        for (const b of detail.inventoryBatches ?? []) {
          batchMap[b.batchNo] = { id: b.id, qty: b.quantityAvailable }
        }
        const enriched: GRNItem[] = (detail.items ?? []).map((item: any) => ({
          ...item,
          batchId: batchMap[item.batchNo]?.id,
          availableQty: batchMap[item.batchNo]?.qty ?? 0,
          purchaseRatePerUnit: Number(item.purchaseRatePerUnit),
        }))
        setGrnItems(enriched)
        const qtys: Record<string, number> = {}
        enriched.forEach((i) => { qtys[i.id] = 0 })
        setReturnQtys(qtys)
      }
    } catch {
      setGrnError('Failed to fetch GRN. Please try again.')
    } finally {
      setGrnLoading(false)
    }
  }

  async function handleSubmit() {
    if (!grn) return
    if (!reason.trim()) {
      toast.error('Please provide a reason for the return.')
      return
    }
    const selectedItems = grnItems
      .filter((item) => (returnQtys[item.id] ?? 0) > 0 && item.batchId)
      .map((item) => ({
        drugId: item.drugId,
        batchId: item.batchId!,
        quantityReturned: returnQtys[item.id],
        returnValue: Math.round(returnQtys[item.id] * item.purchaseRatePerUnit * 100) / 100,
      }))
    if (selectedItems.length === 0) {
      toast.error('Please enter a return quantity for at least one item.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/returns/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalGrnId: grn.id,
          supplierId: grn.supplierId,
          returnReason: reason,
          items: selectedItems,
          notes: '',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to initiate return.')
      }
      toast.success('Purchase return initiated successfully.')
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
          <DialogTitle>Initiate Purchase Return</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* GRN search */}
          <div className="space-y-1">
            <Label>GRN Number</Label>
            <div className="flex gap-2">
              <Input
                value={grnSearch}
                onChange={(e) => setGrnSearch(e.target.value)}
                placeholder="e.g. GRN-0001"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchGrn(grnSearch)
                }}
                onBlur={() => searchGrn(grnSearch)}
              />
              <Button variant="outline" onClick={() => searchGrn(grnSearch)} disabled={grnLoading}>
                {grnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {grnError && <p className="text-xs text-red-600">{grnError}</p>}
          </div>

          {/* GRN details */}
          {grn && (
            <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">GRN No</span>
                <span className="font-mono font-medium">{grn.grnNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier</span>
                <span className="font-medium">{grn.supplier?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice No</span>
                <span>{grn.supplierInvoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Received Date</span>
                <span>{format(new Date(grn.receivedDate), 'dd MMM yyyy')}</span>
              </div>
            </div>
          )}

          {/* Items */}
          {grnItems.length > 0 && (
            <div className="space-y-1">
              <Label>Return Items</Label>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">GRN Qty</TableHead>
                      <TableHead className="text-right w-28">Return Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">
                          {item.drug?.name}
                          {item.drug?.brandName && (
                            <span className="text-xs text-slate-400 ml-1">({item.drug.brandName})</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{item.batchNo}</TableCell>
                        <TableCell className="text-right text-slate-600 text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={returnQtys[item.id] ?? 0}
                            onChange={(e) =>
                              setReturnQtys((prev) => ({
                                ...prev,
                                [item.id]: Math.min(Number(e.target.value), item.quantity),
                              }))
                            }
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <Label>
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select return reason…" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !grn || !reason || !Object.values(returnQtys).some((q) => q > 0)}
          >
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
          <DialogTitle>Reject Purchase Return</DialogTitle>
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

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const [showInitiate, setShowInitiate] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/returns/purchases')
      const data = await res.json()
      setReturns(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load purchase returns.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReturns()
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user?.role === 'manager' || session?.user?.role === 'admin') {
          setIsManager(true)
        }
      })
      .catch(() => {})
  }, [fetchReturns])

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/returns/purchases/${id}/approve`, {
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
    const res = await fetch(`/api/returns/purchases/${id}/approve`, {
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
        title="Purchase Returns"
        subtitle="Manage supplier GRN returns"
        action={
          <Button onClick={() => setShowInitiate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Initiate Return
          </Button>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-purchase-returns"
        steps={[
          {
            title: 'Find Original GRN',
            description: 'Search by GRN number or supplier name to locate the purchase to reverse',
          },
          {
            title: 'Select Return Items',
            description: 'Choose which drug batches (and quantities) are being returned to supplier',
          },
          {
            title: 'Record Reason',
            description: 'Document the return reason (damaged, wrong batch, near-expiry, etc.)',
          },
          {
            title: 'Stock Adjusted',
            description: 'Confirmed purchase returns deduct the returned quantity from inventory',
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
          title="No purchase returns"
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
                <TableHead>GRN No</TableHead>
                <TableHead>Supplier</TableHead>
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
                  <TableCell className="font-mono text-sm">{ret.originalGrn?.grnNumber}</TableCell>
                  <TableCell className="font-medium">{ret.originalGrn?.supplier?.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(Number(ret.totalReturnAmount ?? 0))}
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

      <InitiatePurchaseReturnDialog
        open={showInitiate}
        onOpenChange={setShowInitiate}
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

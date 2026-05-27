'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LifecycleBanner } from '@/components/shared/LifecycleBanner'
import { ConfirmGate } from '@/components/shared/ConfirmGate'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
type BatchStatus = 'QUARANTINED' | 'EXPIRED' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY' | 'LOW_STOCK' | 'AVAILABLE'

interface Batch {
  id: string
  batchNumber: string
  receivedAt: string
  expiryDate: string
  quantityReceived: number
  quantityAvailable: number
  mrp: number
  isQuarantined: boolean
  quarantineReason?: string
  drug: {
    id: string
    name: string
    brandName?: string
    schedule: string
    reorderLevel: number
  }
}

const inrFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

function computeBatchStatus(batch: Batch): BatchStatus {
  const now = new Date()
  const nearExpiryThreshold = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  if (batch.isQuarantined) return 'QUARANTINED'
  if (new Date(batch.expiryDate) <= now) return 'EXPIRED'
  if (batch.quantityAvailable === 0) return 'OUT_OF_STOCK'
  if (new Date(batch.expiryDate) <= nearExpiryThreshold) return 'NEAR_EXPIRY'
  if (batch.quantityAvailable <= batch.drug.reorderLevel) return 'LOW_STOCK'
  return 'AVAILABLE'
}

const statusBadgeMap: Record<BatchStatus, string> = {
  QUARANTINED: 'quarantined',
  EXPIRED: 'expired',
  OUT_OF_STOCK: 'out_of_stock',
  NEAR_EXPIRY: 'near_expiry',
  LOW_STOCK: 'low_stock',
  AVAILABLE: 'available',
}

const bannerMessages: Record<BatchStatus, string> = {
  AVAILABLE: 'This batch is available for dispensing.',
  LOW_STOCK: 'Stock is below reorder level. Consider placing a purchase order.',
  NEAR_EXPIRY: 'This batch expires within 90 days. Prioritise dispensing.',
  OUT_OF_STOCK: 'This batch has no stock remaining.',
  EXPIRED: 'This batch has expired and cannot be dispensed.',
  QUARANTINED: 'This batch is quarantined and cannot be dispensed.',
}

const bannerVariantMap: Record<BatchStatus, string> = {
  AVAILABLE: 'active',
  LOW_STOCK: 'pending',
  NEAR_EXPIRY: 'pending',
  OUT_OF_STOCK: 'cancelled',
  EXPIRED: 'rejected',
  QUARANTINED: 'inactive',
}

const MANAGER_ROLES = ['pharmacist_manager', 'admin']

export default function DrugBatchesPage() {
  const params = useParams()
  const drugId = params.drugId as string
  const [userRole, setUserRole] = useState('')
  const isManager = MANAGER_ROLES.includes(userRole)

  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  // Quarantine dialog state
  const [quarantineTarget, setQuarantineTarget] = useState<Batch | null>(null)
  const [quarantineReason, setQuarantineReason] = useState('')
  const [quarantineLoading, setQuarantineLoading] = useState(false)

  // Release confirm state
  const [releaseTarget, setReleaseTarget] = useState<Batch | null>(null)
  const [releaseLoading, setReleaseLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setUserRole(s?.user?.role ?? ''))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!drugId) return
    fetch(`/api/inventory/batches?drugId=${drugId}`)
      .then((r) => r.json())
      .then((d) => setBatches(Array.isArray(d) ? d : []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [drugId])

  const drugName = batches[0]?.drug?.name ?? 'Drug'
  const drugBrand = batches[0]?.drug?.brandName

  async function handleQuarantine() {
    if (!quarantineTarget) return
    setQuarantineLoading(true)
    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: quarantineTarget.id,
          isQuarantined: true,
          quarantineReason,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBatches((prev) => prev.map((b) => (b.id === updated.id ? { ...b, isQuarantined: true, quarantineReason } : b)))
      }
    } finally {
      setQuarantineLoading(false)
      setQuarantineTarget(null)
      setQuarantineReason('')
    }
  }

  async function handleRelease() {
    if (!releaseTarget) return
    setReleaseLoading(true)
    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: releaseTarget.id,
          isQuarantined: false,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBatches((prev) => prev.map((b) => (b.id === updated.id ? { ...b, isQuarantined: false, quarantineReason: undefined } : b)))
      }
    } finally {
      setReleaseLoading(false)
      setReleaseTarget(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={`${drugName}${drugBrand ? ` — ${drugBrand}` : ''} — Batches`}
        breadcrumb={[
          { label: 'Inventory', href: '/inventory' },
          { label: drugName },
        ]}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Per-batch lifecycle banners */}
          <div className="space-y-2 mb-6">
            {batches.map((batch) => {
              const status = computeBatchStatus(batch)
              return (
                <LifecycleBanner
                  key={batch.id}
                  status={bannerVariantMap[status]}
                  statusLabel={status.replace(/_/g, ' ')}
                  message={`Batch ${batch.batchNumber}: ${bannerMessages[status]}`}
                />
              )
            })}
          </div>

          {/* Batch table */}
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Received Qty</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead>Status</TableHead>
                  {isManager && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const status = computeBatchStatus(batch)
                  const badgeStatus = statusBadgeMap[status]
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-sm font-medium">{batch.batchNumber}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(batch.receivedAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{batch.quantityReceived}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{batch.quantityAvailable}</TableCell>
                      <TableCell className="text-right text-sm">{inrFormat.format(batch.mrp)}</TableCell>
                      <TableCell>
                        <StatusBadge status={badgeStatus} />
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {status === 'AVAILABLE' || status === 'LOW_STOCK' || status === 'NEAR_EXPIRY' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs"
                              onClick={() => setQuarantineTarget(batch)}
                            >
                              Quarantine
                            </Button>
                          ) : status === 'QUARANTINED' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
                              onClick={() => setReleaseTarget(batch)}
                            >
                              Release
                            </Button>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Quarantine dialog with reason input */}
      <Dialog open={!!quarantineTarget} onOpenChange={(open) => { if (!open) { setQuarantineTarget(null); setQuarantineReason('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quarantine Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Batch <span className="font-mono font-medium">{quarantineTarget?.batchNumber}</span> will be quarantined
              and cannot be dispensed until released.
            </p>
            <div className="space-y-1">
              <Label htmlFor="quarantine-reason">Reason (required)</Label>
              <Input
                id="quarantine-reason"
                placeholder="e.g. Failed quality check, damaged packaging…"
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setQuarantineTarget(null); setQuarantineReason('') }} disabled={quarantineLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleQuarantine}
              disabled={quarantineLoading || !quarantineReason.trim()}
            >
              {quarantineLoading ? 'Processing…' : 'Quarantine Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release confirm dialog */}
      <ConfirmGate
        open={!!releaseTarget}
        onOpenChange={(open) => { if (!open) setReleaseTarget(null) }}
        title="Release from Quarantine"
        consequence={`Batch ${releaseTarget?.batchNumber} will be released from quarantine and become available for dispensing again.`}
        confirmLabel="Release Batch"
        onConfirm={handleRelease}
        loading={releaseLoading}
      />
    </div>
  )
}

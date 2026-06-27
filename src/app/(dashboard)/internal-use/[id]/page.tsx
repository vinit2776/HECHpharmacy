'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, ArrowLeft, AlertTriangle, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmGate } from '@/components/shared/ConfirmGate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEPT_LABELS: Record<string, string> = {
  ot: 'OT (Operation Theatre)',
  general_ward: 'General Ward',
  icu: 'ICU',
  casualty: 'Casualty',
  pharmacy_own: 'Pharmacy Own Use',
  other: 'Other',
}

const PURPOSE_LABELS: Record<string, string> = {
  surgery: 'Surgery',
  dept_stock: 'Department Stock',
  emergency: 'Emergency',
  maintenance: 'Maintenance',
  other: 'Other',
}

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

export default function InternalRequisitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [ir, setIr] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [issueOpen, setIssueOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchIr = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/internal-requisitions/${id}`)
      if (!res.ok) throw new Error('Not found')
      setIr(await res.json())
    } catch {
      toast.error('Failed to load requisition')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchIr() }, [id])

  const handleIssue = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/internal-requisitions/${id}/issue`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to issue')
      }
      toast.success('Requisition issued — inventory deducted')
      await fetchIr()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
      setIssueOpen(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/internal-requisitions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to cancel')
      }
      toast.success('Requisition cancelled')
      await fetchIr()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
      setCancelOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!ir) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-slate-500">Requisition not found.</p>
        <Button variant="outline" onClick={() => router.push('/internal-use')} className="mt-4">
          Back to List
        </Button>
      </div>
    )
  }

  const scheduleHItems = ir.items?.filter((i: any) => {
    const s = i.schedule?.toUpperCase()
    return s === 'H' || s === 'H1'
  }) ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title={ir.requisitionNumber}
        subtitle="Internal Drug Requisition"
        breadcrumb={[
          { label: 'Internal Use', href: '/internal-use' },
          { label: ir.requisitionNumber },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={() => router.push('/internal-use')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
        }
      />

      {/* Summary card */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Status</p>
              <StatusBadge status={ir.status} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Date</p>
              <p className="font-medium">{format(new Date(ir.requisitionDate), 'dd MMM yyyy, HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Department</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <p className="font-medium">{DEPT_LABELS[ir.department] ?? ir.department}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Purpose</p>
              <p className="font-medium">{PURPOSE_LABELS[ir.purpose] ?? ir.purpose}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Requested By</p>
              <p className="font-medium">{ir.requestedByUser?.name}</p>
            </div>
            {ir.doctor && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Doctor</p>
                <p className="font-medium">Dr. {ir.doctor.name}</p>
              </div>
            )}
            {ir.approvedByUser && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Approved By</p>
                <p className="font-medium">{ir.approvedByUser.name}</p>
                {ir.approvedAt && (
                  <p className="text-xs text-slate-400">{format(new Date(ir.approvedAt), 'dd MMM yyyy, HH:mm')}</p>
                )}
              </div>
            )}
            {ir.cancellationReason && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cancellation Reason</p>
                <p className="text-slate-600">{ir.cancellationReason}</p>
              </div>
            )}
            {ir.notes && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-slate-600">{ir.notes}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Cost (at purchase rate)</p>
              <p className="font-semibold text-blue-700">{INR(ir.totalCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule H warning */}
      {scheduleHItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Schedule H/H1 drugs — ensure prescription is on file</p>
            <p className="text-amber-700 mt-0.5">
              {scheduleHItems.map((i: any) => i.drugName).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Drug Items ({ir.items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Drug</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty Issued</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ir.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.drugName}</span>
                    {(item.schedule?.toUpperCase() === 'H' || item.schedule?.toUpperCase() === 'H1') && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        {item.schedule?.toUpperCase()}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{item.batchNo}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(item.expiryDate), 'MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.quantityIssued}</TableCell>
                  <TableCell className="text-right text-sm">{INR(item.unitCost)}</TableCell>
                  <TableCell className="text-right font-semibold">{INR(item.totalCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total at purchase rate</p>
              <p className="text-lg font-bold text-blue-700">{INR(ir.totalCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions — only for draft */}
      {ir.status === 'draft' && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="w-4 h-4 mr-1.5" /> Cancel Requisition
          </Button>
          <Button onClick={() => setIssueOpen(true)} className="ml-auto gap-2">
            <CheckCircle2 className="w-4 h-4" /> Approve & Issue (Deduct Stock)
          </Button>
        </div>
      )}

      {/* Issue confirmation */}
      <ConfirmGate
        open={issueOpen}
        onOpenChange={setIssueOpen}
        title="Approve & Issue Requisition"
        consequence={`This will deduct stock for ${ir.items?.length} drug line(s) from inventory.\n\nDepartment: ${DEPT_LABELS[ir.department] ?? ir.department}\nTotal cost: ${INR(ir.totalCost)}\n\nThis action cannot be undone. Only approve if drugs are physically leaving the pharmacy.`}
        confirmLabel="Yes, Issue & Deduct Stock"
        onConfirm={handleIssue}
        loading={actionLoading}
      />

      {/* Cancel dialog */}
      {/* Cancel reason input — shown above the confirm dialog trigger */}
      {cancelOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Cancel Requisition</h3>
            <p className="text-sm text-slate-500">The draft requisition will be cancelled. No stock will be deducted.</p>
            <div className="space-y-1">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation…"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setCancelOpen(false); setCancelReason('') }} disabled={actionLoading}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? 'Cancelling…' : 'Yes, Cancel Requisition'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

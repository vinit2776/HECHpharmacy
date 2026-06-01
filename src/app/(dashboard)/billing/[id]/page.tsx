'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Printer, XCircle, RotateCcw, ArrowLeft, Loader2 } from 'lucide-react'

import { LifecycleBanner } from '@/components/shared/LifecycleBanner'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BillPDF, type PharmacyInfo } from '@/components/print/BillPDF'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
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

// ─── helpers ─────────────────────────────────────────────────────────────────

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function ScheduleBadge({ schedule }: { schedule: string }) {
  const s = schedule?.toUpperCase()
  if (s === 'H1')
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        H1
      </span>
    )
  if (s === 'H')
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        H
      </span>
    )
  return null
}

// ─── types ───────────────────────────────────────────────────────────────────

interface BillItem {
  id: string
  drugName: string
  schedule: string
  batchNo: string
  expiryDate: string
  quantity: number
  mrpPerUnit: number
  discountPct: number
  discountAmount: number
  taxableAmount: number
  gstRate: number
  gstAmount: number
  netAmount: number
}

interface Bill {
  id: string
  billNumber: string
  createdAt: string
  status: 'active' | 'cancelled' | 'returned'
  paymentMode: string
  notes?: string
  patient?: {
    id: string
    name: string
    hospitalPatientId?: string
    patientCategory?: string
    age?: number
    gender?: string
  }
  doctor?: {
    id: string
    name: string
  }
  prescriptionNo?: string
  items: BillItem[]
  subtotalMrp: number
  totalDiscount: number
  totalGst: number
  totalAmount: number
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function BillDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [pharmacy, setPharmacy] = useState<PharmacyInfo | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/billing/bills/${id}`).then(async (res) => {
        if (!res.ok) throw new Error('Failed to load bill')
        return res.json()
      }),
      fetch('/api/settings/pharmacy').then((r) => r.ok ? r.json() : null),
    ])
      .then(([billData, pharmacyData]) => {
        setBill(billData)
        if (pharmacyData) setPharmacy(pharmacyData)
      })
      .catch(() => toast.error('Failed to load bill details'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!bill || !cancelReason.trim()) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/billing/bills/${bill.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to cancel bill')
      }
      toast.success(`Bill ${bill.billNumber} cancelled`)
      setBill((prev) => prev ? { ...prev, status: 'cancelled' } : prev)
      setCancelOpen(false)
      setCancelReason('')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to cancel bill')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <BillDetailSkeleton />
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-slate-500 text-center py-16">Bill not found.</p>
      </div>
    )
  }

  const scheduleHCount = bill.items.filter(
    (i) => i.schedule?.toUpperCase() === 'H' || i.schedule?.toUpperCase() === 'H1'
  ).length

  return (
    <>
      {/* Print-hidden elements via class; main wrapper always visible */}
      <div className="max-w-4xl mx-auto px-4 py-6 print:max-w-none print:px-0 print:py-0">
        {/* Lifecycle banner */}
        {bill.status === 'active' ? (
          <LifecycleBanner
            status="active"
            message={
              scheduleHCount > 0
                ? `Form 18 entries created for ${scheduleHCount} Schedule H/H1 drug${scheduleHCount > 1 ? 's' : ''}.`
                : 'Bill confirmed.'
            }
          />
        ) : (
          <LifecycleBanner
            status="cancelled"
            message="This bill has been cancelled. Stock has been reversed."
          />
        )}

        {/* Header */}
        <PageHeader
          title={bill.billNumber}
          subtitle={format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a')}
          breadcrumb={[
            { label: 'Billing', href: '/billing/history' },
            { label: bill.billNumber },
          ]}
          action={
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/billing/history')}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              {bill.status === 'active' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/returns/sales?billId=${bill.id}`)}
                    className="gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Initiate Return
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelOpen(true)}
                    className="gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Bill
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Patient */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Patient</p>
              {bill.patient ? (
                <>
                  <p className="font-semibold text-slate-900">{bill.patient.name}</p>
                  {bill.patient.hospitalPatientId && (
                    <p className="text-xs text-slate-400 font-mono">{bill.patient.hospitalPatientId}</p>
                  )}
                  {bill.patient.patientCategory && (
                    <div className="mt-1">
                      <StatusBadge status={bill.patient.patientCategory} />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500">Walk-in Patient</p>
              )}
            </CardContent>
          </Card>

          {/* Doctor / Prescription */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">
                Doctor / Prescription
              </p>
              {bill.doctor ? (
                <p className="font-semibold text-slate-900">Dr. {bill.doctor.name}</p>
              ) : (
                <p className="text-slate-500 text-sm">—</p>
              )}
              {bill.prescriptionNo && (
                <p className="text-xs text-slate-500 mt-0.5">Rx: {bill.prescriptionNo}</p>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">
                Payment
              </p>
              <p className="font-semibold text-slate-900 capitalize">{bill.paymentMode}</p>
              <StatusBadge status={bill.status} className="mt-1" />
            </CardContent>
          </Card>
        </div>

        {/* Items table */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>#</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Batch / Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">MRP/unit</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-slate-400 text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-900">{item.drugName}</span>
                      <ScheduleBadge schedule={item.schedule} />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    <span className="font-mono">{item.batchNo}</span>
                    {item.expiryDate && (
                      <span className="ml-1">
                        (Exp: {format(new Date(item.expiryDate), 'MMM yyyy')})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{INR(item.mrpPerUnit)}</TableCell>
                  <TableCell className="text-right text-green-700">
                    {item.discountPct > 0 ? `${item.discountPct}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {item.gstRate > 0 ? `${item.gstRate}% (${INR(item.gstAmount)})` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{INR(item.netAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="bg-slate-50 border rounded-lg px-4 py-3 text-sm space-y-1 min-w-[240px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal (MRP)</span>
              <span>{INR(bill.subtotalMrp)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Total Discount</span>
              <span>− {INR(bill.totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total GST</span>
              <span>{INR(bill.totalGst)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-bold text-base">
              <span>Net Payable</span>
              <span>{INR(bill.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {bill.notes && (
          <div className="text-sm text-slate-500 border-t pt-4">
            <span className="font-medium text-slate-700">Notes: </span>
            {bill.notes}
          </div>
        )}

        {/* Print layout — invisible on screen, renders as the A5 bill when printing */}
        <div className="hidden print:block">
          <BillPDF
            pharmacy={pharmacy ?? undefined}
            bill={{
              billNumber:    bill.billNumber,
              createdAt:     bill.createdAt,
              paymentMode:   bill.paymentMode,
              prescriptionNo: bill.prescriptionNo,
              patient: {
                name:              bill.patient?.name ?? 'Walk-in Patient',
                hospitalPatientId: bill.patient?.hospitalPatientId ?? '',
                age:               bill.patient?.age,
                gender:            bill.patient?.gender,
                patientCategory:   bill.patient?.patientCategory ?? 'general',
              },
              doctor: bill.doctor ? { name: bill.doctor.name } : undefined,
              items: bill.items.map((item) => ({
                drugName:    item.drugName,
                schedule:    item.schedule,
                batchNo:     item.batchNo,
                expiryDate:  item.expiryDate
                  ? format(new Date(item.expiryDate), 'MM/yy')
                  : '',
                quantity:    item.quantity,
                mrpPerUnit:  item.mrpPerUnit,
                discountPct: item.discountPct,
                netAmount:   item.netAmount,
              })),
              grossAmount:   bill.subtotalMrp,
              totalDiscount: bill.totalDiscount,
              totalGst:      bill.totalGst,
              netPayable:    bill.totalAmount,
            }}
          />
        </div>
      </div>

      {/* Cancel confirm — requires a reason */}
      <Dialog open={cancelOpen} onOpenChange={(open) => { if (!open) { setCancelOpen(false); setCancelReason('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-slate-600">
              Cancel <span className="font-mono font-medium">{bill.billNumber}</span> for{' '}
              <span className="font-medium">{bill.patient?.name ?? 'Walk-in Patient'}</span>?{' '}
              Net amount <span className="font-medium">{INR(bill.totalAmount)}</span> will be voided and stock reversed.
              This action cannot be undone.
            </p>
            <div className="space-y-1">
              <Label htmlFor="cancel-reason">
                Cancellation Reason <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient changed mind, wrong drug dispensed…"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelOpen(false); setCancelReason('') }} disabled={cancelling}>
              Keep Bill
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? 'Cancelling…' : 'Yes, Cancel Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppress sidebar in print */}
      <style jsx global>{`
        @media print {
          [data-sidebar], nav, aside, header.dashboard-header {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleBanner } from '@/components/shared/LifecycleBanner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmGate } from '@/components/shared/ConfirmGate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Snowflake, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)
}

export default function GrnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [grn, setGrn] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returning, setReturning] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/purchasing/grns/${id}`)
    const d = await r.json()
    setGrn(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function initiateReturn() {
    setReturning(true)
    try {
      const r = await fetch('/api/returns/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grnId: id, reason: 'Purchase return initiated from GRN detail' }),
      })
      if (!r.ok) throw new Error('Failed to initiate return')
      toast.success('Purchase return initiated — awaiting manager approval')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setReturning(false)
      setReturnOpen(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    )
  }

  if (!grn) return <div className="text-slate-500 py-12 text-center">GRN not found.</div>

  const totalGst = grn.items?.reduce((a: number, i: any) => a + Number(i.gstAmount), 0) ?? 0
  const netPayable = Number(grn.netPayable)

  return (
    <div>
      <PageHeader
        title={`GRN ${grn.grnNumber}`}
        breadcrumb={[{ label: 'Purchases', href: '/purchasing' }, { label: grn.grnNumber }]}
        action={
          grn.status === 'confirmed' ? (
            <Button variant="outline" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Initiate Return
            </Button>
          ) : null
        }
      />

      {grn.status === 'draft' && (
        <LifecycleBanner
          status="draft"
          message="Stock has not yet been added to inventory. Continue editing and confirm to receive the stock."
          actions={[{ label: 'Continue GRN', onClick: () => router.push('/purchasing/new') }]}
        />
      )}

      {grn.status === 'confirmed' && (
        <LifecycleBanner
          status="confirmed"
          message="All batches have been added to inventory. Form 17 entries have been auto-created."
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6 p-4 bg-slate-50 rounded-lg text-sm">
        <div>
          <p className="text-slate-500 text-xs">Supplier</p>
          <p className="font-semibold mt-0.5">{grn.supplier?.name}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Invoice No</p>
          <p className="font-semibold mt-0.5">{grn.supplierInvoiceNo}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Invoice Date</p>
          <p className="font-semibold mt-0.5">{grn.supplierInvoiceDate ? format(new Date(grn.supplierInvoiceDate), 'dd MMM yyyy') : '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Received Date</p>
          <p className="font-semibold mt-0.5">{format(new Date(grn.receivedDate), 'dd MMM yyyy')}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Status</p>
          <div className="mt-0.5"><StatusBadge status={grn.status} /></div>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Net Payable</p>
          <p className="font-bold mt-0.5">{fmt(netPayable)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Created By</p>
          <p className="font-semibold mt-0.5">{grn.createdBy?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Created At</p>
          <p className="font-semibold mt-0.5">{format(new Date(grn.createdAt), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">MRP/Unit</TableHead>
              <TableHead className="text-right">Rate/Unit</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grn.items?.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.drug?.name}</span>
                    {item.coldChainVerified === false && (
                      <Badge variant="destructive" className="text-xs">Quarantined</Badge>
                    )}
                    {item.coldChainVerified === true && (
                      <span className="text-blue-600 flex items-center gap-1 text-xs">
                        <Snowflake className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.drug?.brandName}</p>
                </TableCell>
                <TableCell className="font-mono text-sm">{item.batchNo}</TableCell>
                <TableCell className="text-sm">
                  {item.expiryDate ? format(new Date(item.expiryDate), 'MMM yyyy') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {item.quantity}{item.freeQuantity > 0 ? `+${item.freeQuantity}` : ''}
                </TableCell>
                <TableCell className="text-right">{fmt(Number(item.mrpPerUnit))}</TableCell>
                <TableCell className="text-right">{fmt(Number(item.purchaseRatePerUnit))}</TableCell>
                <TableCell className="text-right text-slate-600">{fmt(Number(item.gstAmount))}</TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(item.lineTotal))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end mt-4">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">GST Total</span>
            <span>{fmt(totalGst)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Net Payable</span>
            <span>{fmt(netPayable)}</span>
          </div>
        </div>
      </div>

      <ConfirmGate
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Initiate Purchase Return?"
        consequence={`• A purchase return request will be raised for GRN ${grn.grnNumber}\n• The return requires manager approval before stock is decremented\n• You cannot undo this action once submitted`}
        confirmLabel="Submit Return Request"
        cancelLabel="Cancel"
        onConfirm={initiateReturn}
        loading={returning}
      />
    </div>
  )
}

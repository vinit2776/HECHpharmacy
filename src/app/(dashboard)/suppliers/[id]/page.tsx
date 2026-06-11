'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstin: string | null
  drugLicenseNo: string | null
  paymentTermsDays: number
  isActive: boolean
  createdAt: string
}

interface GRN {
  id: string
  grnNumber: string
  receivedDate: string
  status: string
  netPayable: number
  supplierInvoiceNo: string | null
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right max-w-xs">{value || '—'}</span>
    </div>
  )
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [grns, setGrns] = useState<GRN[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/suppliers/${id}`).then((r) => {
        if (!r.ok) throw new Error('Supplier not found')
        return r.json()
      }),
      fetch(`/api/purchasing/grns?supplierId=${id}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([supplierData, grnData]) => {
        setSupplier(supplierData)
        setGrns(Array.isArray(grnData) ? grnData.slice(0, 10) : [])
      })
      .catch((e) => {
        toast.error(e.message ?? 'Failed to load supplier')
        router.push('/suppliers')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!supplier) return null

  const fullAddress = [supplier.address, supplier.city, supplier.state, supplier.pincode]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title={supplier.name}
        subtitle={supplier.type.charAt(0).toUpperCase() + supplier.type.slice(1)}
        breadcrumb={[
          { label: 'Suppliers', href: '/suppliers' },
          { label: supplier.name },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/suppliers')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/purchasing/new?supplierId=${supplier.id}`)}
            >
              + New GRN
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Contact Details */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Contact Details</h2>
          </div>
          <Separator className="mb-3" />
          <InfoRow label="Contact Person" value={supplier.contactPerson} />
          <InfoRow label="Phone" value={supplier.phone} />
          <InfoRow label="Email" value={supplier.email} />
          <InfoRow label="Address" value={fullAddress || null} />
        </div>

        {/* Business Details */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Business Details</h2>
          </div>
          <Separator className="mb-3" />
          <InfoRow label="GSTIN" value={supplier.gstin} />
          <InfoRow label="Drug License No" value={supplier.drugLicenseNo} />
          <InfoRow label="Payment Terms" value={`${supplier.paymentTermsDays} days`} />
          <div className="flex justify-between py-2 text-sm">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
          </div>
          <InfoRow
            label="Added On"
            value={supplier.createdAt ? format(new Date(supplier.createdAt), 'dd MMM yyyy') : null}
          />
        </div>
      </div>

      {/* Recent GRNs */}
      <div className="mt-6 bg-white border rounded-lg overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Recent Purchases (GRNs)</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500"
            onClick={() => router.push('/purchasing')}
          >
            View all →
          </Button>
        </div>
        <Separator />
        {grns.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No GRNs recorded for this supplier yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN No</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.map((grn) => (
                <TableRow
                  key={grn.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/purchasing/${grn.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">{grn.grnNumber}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{grn.supplierInvoiceNo || '—'}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {format(new Date(grn.receivedDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={grn.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(grn.netPayable))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

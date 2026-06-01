'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfMonth } from 'date-fns'
import { Printer, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
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
import { cn } from '@/lib/utils'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

const fmtNum = (v: number) =>
  new Intl.NumberFormat('en-IN').format(v)

interface Form18Row {
  id: string
  serialNo: number
  date: string
  patientName: string
  billNo: string
  drugName: string
  schedule: string
  batchNo: string
  expiryDate: string
  quantity: number
  mrpPerUnit: number
  discountedRate: number
  netAmount: number
}

function defaultFrom() {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd')
}

function defaultTo() {
  return format(new Date(), 'yyyy-MM-dd')
}

export default function Form18Page() {
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [rows, setRows] = useState<Form18Row[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      const res = await fetch(`/api/registers/form18?${params}`)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load Form 18 data.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity), 0)
  const totalNet = rows.reduce((s, r) => s + Number(r.netAmount), 0)
  const h1Count = rows.filter((r) => r.schedule === 'H1').length

  return (
    <div>
      <PageHeader
        title="Sales Register — Form 18"
        subtitle="Statutory register of all drug sales"
        action={
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-form18"
        steps={[
          {
            title: 'Auto-populated',
            description:
              'Form 18 entries are automatically created from confirmed bills containing Schedule H/H1 drugs',
          },
          {
            title: 'Filter by Date',
            description:
              'Use the date range filter to view entries for the required inspection period',
          },
          {
            title: 'Prescription Check',
            description:
              'Each entry records the patient name, doctor, and prescription details for H1 drugs',
          },
          {
            title: 'Print / Export',
            description:
              'Download or print for submission to the Drug Inspector during inspection',
          },
        ]}
      />

      {/* Date range filter */}
      <div className="flex items-end gap-4 mb-6 print:hidden">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : 'Apply'}
        </Button>
      </div>

      {h1Count > 0 && (
        <div className="flex items-center gap-2 mb-4 text-xs text-amber-700 print:hidden">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-50 border border-amber-300" />
          Schedule H1 rows ({h1Count}) are highlighted — controlled drugs requiring special record-keeping.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No sales entries"
          description="No Form 18 entries found for the selected date range."
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Bill No</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">Disc. Rate</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isH1 = row.schedule === 'H1'
                return (
                  <TableRow
                    key={row.id}
                    className={cn(isH1 && 'bg-amber-50 hover:bg-amber-100')}
                  >
                    <TableCell className="text-slate-500 text-sm">{row.serialNo}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(row.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{row.patientName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{row.billNo}</TableCell>
                    <TableCell className="text-sm">{row.drugName}</TableCell>
                    <TableCell>
                      {isH1 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-900">
                          H1
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">{row.schedule || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.batchNo}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(row.expiryDate), 'MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtNum(row.quantity)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(Number(row.mrpPerUnit))}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(Number(row.discountedRate))}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(row.netAmount))}</TableCell>
                  </TableRow>
                )
              })}
              {/* Totals row */}
              <TableRow className="bg-slate-50 font-semibold border-t-2">
                <TableCell colSpan={8} className="text-right text-sm text-slate-600">
                  Totals
                </TableCell>
                <TableCell className="text-right">{fmtNum(totalQty)}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{fmt(totalNet)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

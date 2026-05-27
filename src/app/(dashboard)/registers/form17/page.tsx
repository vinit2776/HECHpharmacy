'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfMonth } from 'date-fns'
import { Printer, FileSpreadsheet, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
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

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

const fmtNum = (v: number) =>
  new Intl.NumberFormat('en-IN').format(v)

interface Form17Row {
  id: string
  serialNo: number
  date: string
  supplierName: string
  invoiceNo: string
  drugName: string
  batchNo: string
  expiryDate: string
  quantity: number
  mrpPerUnit: number
  purchaseRate: number
  gstAmount: number
  lineTotal: number
}

function defaultFrom() {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd')
}

function defaultTo() {
  return format(new Date(), 'yyyy-MM-dd')
}

export default function Form17Page() {
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [rows, setRows] = useState<Form17Row[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      const res = await fetch(`/api/registers/form17?${params}`)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load Form 17 data.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleExportExcel() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ from, to, register: 'form17', format: 'excel' })
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) throw new Error('Export failed.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `form17_${from}_${to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to export.')
    } finally {
      setExporting(false)
    }
  }

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity), 0)
  const totalGst = rows.reduce((s, r) => s + Number(r.gstAmount), 0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.lineTotal), 0)

  return (
    <div>
      <PageHeader
        title="Purchase Register — Form 17"
        subtitle="Statutory register of all drug purchases"
        action={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handleExportExcel} disabled={exporting || loading}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting…' : 'Export Excel'}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        }
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No purchase entries"
          description="No Form 17 entries found for the selected date range."
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">MRP/Unit</TableHead>
                <TableHead className="text-right">Purchase Rate</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-slate-500 text-sm">{row.serialNo}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(row.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{row.supplierName}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{row.invoiceNo}</TableCell>
                  <TableCell className="text-sm">{row.drugName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.batchNo}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(row.expiryDate), 'MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(row.quantity)}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(row.mrpPerUnit))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(row.purchaseRate))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(row.gstAmount))}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(row.lineTotal))}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-slate-50 font-semibold border-t-2">
                <TableCell colSpan={7} className="text-right text-sm text-slate-600">
                  Totals
                </TableCell>
                <TableCell className="text-right">{fmtNum(totalQty)}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{fmt(totalGst)}</TableCell>
                <TableCell className="text-right">{fmt(totalAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

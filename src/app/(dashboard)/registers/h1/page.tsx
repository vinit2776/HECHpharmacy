'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfMonth } from 'date-fns'
import { Printer, Download, BookOpen, TriangleAlert } from 'lucide-react'
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

interface H1Row {
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

export default function H1RegisterPage() {
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [rows, setRows] = useState<H1Row[]>([])
  const [loading, setLoading] = useState(true)
  const [csvDownloading, setCsvDownloading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      const res = await fetch(`/api/registers/h1?${params}`)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load H1 register data.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleDownloadCsv() {
    setCsvDownloading(true)
    try {
      const params = new URLSearchParams({ from, to, format: 'csv' })
      const res = await fetch(`/api/registers/h1?${params}`)
      if (!res.ok) throw new Error('CSV download failed.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const monthLabel = format(new Date(from), 'MMM-yyyy')
      a.download = `H1_Sugam_${monthLabel}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Sugam CSV downloaded.')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to download CSV.')
    } finally {
      setCsvDownloading(false)
    }
  }

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity), 0)
  const totalNet = rows.reduce((s, r) => s + Number(r.netAmount), 0)

  return (
    <div>
      <PageHeader
        title="H1 Register"
        subtitle="Schedule H1 (controlled) drug sales register"
        action={
          <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={handleDownloadCsv}
              disabled={csvDownloading || loading}
            >
              <Download className="w-4 h-4 mr-2" />
              {csvDownloading ? 'Downloading…' : 'Download Sugam CSV'}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print Register
            </Button>
          </div>
        }
      />

      {/* Warning banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-amber-50 border-amber-200 mb-6 print:hidden">
        <TriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Regulatory Reminder: </span>
          H1 Sugam CSV must be uploaded monthly to the{' '}
          <span className="font-medium">Tamil Nadu Drug Controller portal</span>. Ensure
          the CSV is uploaded before the 7th of the following month to remain compliant.
        </div>
      </div>

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
          title="No H1 drug sales"
          description="No Schedule H1 drugs were dispensed in the selected date range."
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
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">Disc. Rate</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="bg-amber-50 hover:bg-amber-100">
                  <TableCell className="text-slate-500 text-sm">{row.serialNo}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(row.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{row.patientName}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{row.billNo}</TableCell>
                  <TableCell className="text-sm font-medium">{row.drugName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.batchNo}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(row.expiryDate), 'MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(row.quantity)}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(row.mrpPerUnit))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(row.discountedRate))}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(row.netAmount))}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-slate-50 font-semibold border-t-2">
                <TableCell colSpan={7} className="text-right text-sm text-slate-600">
                  Totals ({rows.length} entries)
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

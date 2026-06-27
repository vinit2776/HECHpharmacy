'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, FlaskConical } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const DEPT_LABELS: Record<string, string> = {
  ot: 'OT',
  general_ward: 'General Ward',
  icu: 'ICU',
  casualty: 'Casualty',
  pharmacy_own: 'Pharmacy Own Use',
  other: 'Other',
}

const PURPOSE_LABELS: Record<string, string> = {
  surgery: 'Surgery',
  dept_stock: 'Dept Stock',
  emergency: 'Emergency',
  maintenance: 'Maintenance',
  other: 'Other',
}

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

export default function InternalUsePage() {
  const router = useRouter()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [department, setDepartment] = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (department !== 'all') params.set('department', department)
    fetch(`/api/internal-requisitions?${params}`)
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [status, department])

  return (
    <div>
      <PageHeader
        title="Internal Use"
        subtitle="Hospital drug requisitions — OT, wards, and departments"
        action={
          <Button onClick={() => router.push('/internal-use/new')}>
            <Plus className="w-4 h-4 mr-2" /> New Requisition
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {Object.entries(DEPT_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No requisitions found"
          description='Click "New Requisition" to issue drugs for hospital use.'
        />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>IR Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((ir) => (
                <TableRow
                  key={ir.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/internal-use/${ir.id}`)}
                >
                  <TableCell className="font-mono text-sm font-semibold text-blue-700">
                    {ir.requisitionNumber}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {format(new Date(ir.requisitionDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">{DEPT_LABELS[ir.department] ?? ir.department}</TableCell>
                  <TableCell className="text-sm text-slate-500">{PURPOSE_LABELS[ir.purpose] ?? ir.purpose}</TableCell>
                  <TableCell className="text-sm">{ir._count?.items ?? 0}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{INR(ir.totalCost)}</TableCell>
                  <TableCell className="text-sm text-slate-500">{ir.requestedByUser?.name}</TableCell>
                  <TableCell><StatusBadge status={ir.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

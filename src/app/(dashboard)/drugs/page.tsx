'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Snowflake } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Drug {
  id: string
  name: string
  brandName: string | null
  schedule: string
  category: string
  gstRate: number
  coldChainRequired: boolean
  isActive: boolean
}

const scheduleStyles: Record<string, string> = {
  otc: 'bg-slate-100 text-slate-700 border-slate-200',
  g: 'bg-slate-100 text-slate-700 border-slate-200',
  h: 'bg-blue-100 text-blue-800 border-blue-200',
  h1: 'bg-amber-100 text-amber-800 border-amber-200',
  e1: 'bg-purple-100 text-purple-800 border-purple-200',
}

const scheduleLabels: Record<string, string> = {
  otc: 'OTC',
  g: 'G',
  h: 'H',
  h1: 'H1',
  e1: 'E1',
}

export default function DrugsPage() {
  const router = useRouter()
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schedule, setSchedule] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchDrugs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (schedule !== 'all') params.set('schedule', schedule)
      if (statusFilter !== 'all') params.set('isActive', statusFilter === 'active' ? 'true' : 'false')

      const res = await fetch(`/api/drugs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch drugs')
      const data = await res.json()
      setDrugs(data)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [search, schedule, statusFilter])

  useEffect(() => {
    const timer = setTimeout(fetchDrugs, 300)
    return () => clearTimeout(timer)
  }, [fetchDrugs])

  return (
    <div>
      <PageHeader
        title="Drugs"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/drugs/manufacturers')}>
              Manufacturers
            </Button>
            <Button onClick={() => router.push('/drugs/new')}>+ Add Drug</Button>
          </div>
        }
      />

      <LifecycleGuide
        storageKey="lifecycle-drugs"
        steps={[
          {
            title: 'Add Drug',
            description: 'Register a new drug with name, schedule (H/H1/G/X), category, GST rate and reorder level',
          },
          {
            title: 'Purchase Stock',
            description: 'Go to Purchasing to create a GRN; each confirmed GRN adds batch stock for this drug',
          },
          {
            title: 'Available in Billing',
            description: 'Registered drugs with stock appear in the Billing search automatically',
          },
          {
            title: 'Monitor & Update',
            description: 'Update drug details (reorder levels, discounts) as needed from this list',
          },
        ]}
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, brand, or barcode…"
          className="w-72"
        />
        <Select value={schedule} onValueChange={setSchedule}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Schedule" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schedules</SelectItem>
            <SelectItem value="otc">OTC</SelectItem>
            <SelectItem value="g">G</SelectItem>
            <SelectItem value="h">H</SelectItem>
            <SelectItem value="h1">H1</SelectItem>
            <SelectItem value="e1">E1</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>GST %</TableHead>
              <TableHead>Cold Chain</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : drugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="No drugs found"
                    description="Add your first drug to get started"
                  />
                </TableCell>
              </TableRow>
            ) : (
              drugs.map((drug) => (
                <TableRow
                  key={drug.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => router.push(`/drugs/${drug.id}`)}
                >
                  <TableCell className="font-medium text-slate-900">{drug.name}</TableCell>
                  <TableCell className="text-slate-500">{drug.brandName ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        scheduleStyles[drug.schedule] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {scheduleLabels[drug.schedule] ?? drug.schedule.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{drug.category}</TableCell>
                  <TableCell className="text-slate-600">{drug.gstRate}%</TableCell>
                  <TableCell>
                    {drug.coldChainRequired ? (
                      <span className="flex items-center gap-1 text-blue-600 text-sm">
                        <Snowflake className="w-4 h-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={drug.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

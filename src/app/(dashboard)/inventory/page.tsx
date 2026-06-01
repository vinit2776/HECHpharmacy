'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Package, Lock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { LifecycleGuide } from '@/components/shared/LifecycleGuide'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
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

type BatchStatus = 'OUT_OF_STOCK' | 'QUARANTINED' | 'EXPIRED' | 'NEAR_EXPIRY' | 'LOW_STOCK' | 'AVAILABLE'

interface Batch {
  id: string
  expiryDate: string
  quantityAvailable: number
  isQuarantined: boolean
}

interface InventoryEntry {
  drug: {
    id: string
    name: string
    brandName?: string
    schedule: string
    category: string
    reorderLevel: number
  }
  totalStock: number
  batchCount: number
  batches: Batch[]
}

type StatusFilter = 'all' | 'low_stock' | 'out_of_stock' | 'near_expiry' | 'expired' | 'quarantined'

function computeDrugStatus(entry: InventoryEntry): BatchStatus {
  const { totalStock, batches } = entry
  const now = new Date()
  const nearExpiryThreshold = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  if (totalStock === 0) return 'OUT_OF_STOCK'
  if (batches.some((b) => b.isQuarantined)) return 'QUARANTINED'
  if (batches.some((b) => new Date(b.expiryDate) <= now)) return 'EXPIRED'
  if (batches.some((b) => new Date(b.expiryDate) <= nearExpiryThreshold)) return 'NEAR_EXPIRY'
  if (totalStock <= entry.drug.reorderLevel) return 'LOW_STOCK'
  return 'AVAILABLE'
}

const statusBadgeMap: Record<BatchStatus, string> = {
  OUT_OF_STOCK: 'out_of_stock',
  QUARANTINED: 'quarantined',
  EXPIRED: 'expired',
  NEAR_EXPIRY: 'near_expiry',
  LOW_STOCK: 'low_stock',
  AVAILABLE: 'available',
}

const statusFilterMap: Record<StatusFilter, BatchStatus | null> = {
  all: null,
  low_stock: 'LOW_STOCK',
  out_of_stock: 'OUT_OF_STOCK',
  near_expiry: 'NEAR_EXPIRY',
  expired: 'EXPIRED',
  quarantined: 'QUARANTINED',
}

export default function InventoryPage() {
  const router = useRouter()
  const [data, setData] = useState<InventoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const categories = Array.from(new Set(data.map((e) => e.drug.category).filter(Boolean)))

  const filtered = data.filter((entry) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      entry.drug.name.toLowerCase().includes(q) ||
      (entry.drug.brandName?.toLowerCase().includes(q) ?? false)
    const matchCategory = categoryFilter === 'all' || entry.drug.category === categoryFilter
    const status = computeDrugStatus(entry)
    const targetStatus = statusFilterMap[statusFilter]
    const matchStatus = !targetStatus || status === targetStatus
    return matchSearch && matchCategory && matchStatus
  })

  return (
    <div>
      <PageHeader title="Inventory" />

      <LifecycleGuide
        storageKey="lifecycle-inventory"
        steps={[
          {
            title: 'Stock Arrives',
            description: 'Confirm a Purchase (GRN) to add new drug batches to inventory automatically',
          },
          {
            title: 'Monitor Stock',
            description: 'View current stock levels, near-expiry batches, and low-stock alerts here',
          },
          {
            title: 'Quarantine if Needed',
            description: 'Flag suspect batches as quarantined to prevent them from being sold',
          },
          {
            title: 'Replenish',
            description: 'When stock is low, raise a new Purchase (GRN) from the Purchasing menu',
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Search drug name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="near_expiry">Near Expiry</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="quarantined">Quarantined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No stock recorded"
          description="Start by confirming your first purchase (GRN)."
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Batches</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const status = computeDrugStatus(entry)
                const badgeStatus = statusBadgeMap[status]
                const lastBatch = entry.batches[entry.batches.length - 1]
                return (
                  <TableRow
                    key={entry.drug.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/inventory/${entry.drug.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900">{entry.drug.name}</div>
                      {entry.drug.brandName && (
                        <div className="text-xs text-slate-500">{entry.drug.brandName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{entry.drug.schedule}</TableCell>
                    <TableCell className="text-sm text-slate-600">{entry.drug.category}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entry.totalStock}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {status === 'QUARANTINED' && <Lock className="w-3 h-3 text-slate-500" />}
                        <StatusBadge status={badgeStatus} />
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-600">{entry.batchCount}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {lastBatch ? format(new Date(lastBatch.expiryDate), 'dd MMM yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

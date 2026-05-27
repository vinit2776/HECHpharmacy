'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Tag, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  category: string
  schedule: string
  discountConfig?: {
    drugId: string
    discountApplicable: boolean
    bplDiscountPct: number
    generalDiscountPct: number
  } | null
}

interface RowState {
  discountApplicable: boolean
  bplDiscountPct: string
  generalDiscountPct: string
  dirty: boolean
  saving: boolean
}

function buildRowState(drug: Drug): RowState {
  return {
    discountApplicable: drug.discountConfig?.discountApplicable ?? false,
    bplDiscountPct: String(drug.discountConfig?.bplDiscountPct ?? 0),
    generalDiscountPct: String(drug.discountConfig?.generalDiscountPct ?? 0),
    dirty: false,
    saving: false,
  }
}

const scheduleLabels: Record<string, string> = {
  otc: 'OTC',
  g: 'G',
  h: 'H',
  h1: 'H1',
  e1: 'E1',
}

export default function DiscountsPage() {
  const [sessionRole, setSessionRole] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => setSessionRole(data?.user?.role ?? null))
      .catch(() => setSessionRole(null))
      .finally(() => setSessionLoading(false))
  }, [])

  const fetchDrugs = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('search', q)
      const res = await fetch(`/api/drugs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch drugs')
      const data: Drug[] = await res.json()
      setDrugs(data)
      const states: Record<string, RowState> = {}
      for (const drug of data) {
        states[drug.id] = buildRowState(drug)
      }
      setRowStates(states)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionRole === 'manager' || sessionRole === 'super_admin') {
      fetchDrugs('')
    }
  }, [sessionRole, fetchDrugs])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchDrugs(value), 350)
  }

  const updateRow = (drugId: string, patch: Partial<RowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [drugId]: { ...prev[drugId], ...patch },
    }))
  }

  const handleToggle = async (drug: Drug) => {
    const current = rowStates[drug.id]
    if (!current) return
    const newVal = !current.discountApplicable
    updateRow(drug.id, { discountApplicable: newVal, dirty: true, saving: true })
    try {
      const res = await fetch(`/api/drugs/${drug.id}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountApplicable: newVal }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to update')
      }
      toast.success(`Discount ${newVal ? 'enabled' : 'disabled'} for ${drug.name}`)
      updateRow(drug.id, { dirty: false })
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update discount')
      updateRow(drug.id, { discountApplicable: !newVal, dirty: false })
    } finally {
      updateRow(drug.id, { saving: false })
    }
  }

  const handleSaveRow = async (drug: Drug) => {
    const current = rowStates[drug.id]
    if (!current) return
    const bpl = parseFloat(current.bplDiscountPct)
    const general = parseFloat(current.generalDiscountPct)
    if (isNaN(bpl) || bpl < 0 || bpl > 100) {
      toast.error('BPL discount must be between 0 and 100')
      return
    }
    if (isNaN(general) || general < 0 || general > 100) {
      toast.error('General discount must be between 0 and 100')
      return
    }
    updateRow(drug.id, { saving: true })
    try {
      const res = await fetch(`/api/drugs/${drug.id}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bplDiscountPct: bpl, generalDiscountPct: general }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to save')
      }
      toast.success(`Discounts saved for ${drug.name}`)
      updateRow(drug.id, { dirty: false })
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save discounts')
    } finally {
      updateRow(drug.id, { saving: false })
    }
  }

  if (sessionLoading) {
    return (
      <div>
        <PageHeader title="Discount Configuration" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (sessionRole !== 'manager' && sessionRole !== 'super_admin') {
    return (
      <div>
        <PageHeader
          title="Discount Configuration"
          breadcrumb={[{ label: 'Settings' }, { label: 'Discount Configuration' }]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Only Managers and Super Admins can configure discounts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Discount Configuration"
        subtitle="Configure BPL and general discounts per drug"
        breadcrumb={[{ label: 'Settings' }, { label: 'Discount Configuration' }]}
      />

      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search drugs by name or brand…"
          className="w-80"
        />
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
              <TableHead>Drug Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-center">Discount Applicable</TableHead>
              <TableHead className="text-center">BPL Discount %</TableHead>
              <TableHead className="text-center">General Discount %</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : drugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Tag}
                    title="No drugs found"
                    description={
                      search
                        ? 'No drugs match your search query'
                        : 'Add drugs to configure their discounts'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              drugs.map((drug) => {
                const row = rowStates[drug.id]
                if (!row) return null
                return (
                  <TableRow key={drug.id}>
                    <TableCell className="font-medium text-slate-900">{drug.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {drug.brandName ?? '—'}
                    </TableCell>
                    <TableCell className="capitalize text-slate-600 text-sm">
                      {drug.category}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {scheduleLabels[drug.schedule] ?? drug.schedule.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.discountApplicable}
                        disabled={row.saving}
                        onClick={() => handleToggle(drug)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                          row.discountApplicable ? 'bg-green-500' : 'bg-slate-200'
                        } ${row.saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            row.discountApplicable ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={row.bplDiscountPct}
                        disabled={!row.discountApplicable}
                        onChange={(e) =>
                          updateRow(drug.id, { bplDiscountPct: e.target.value, dirty: true })
                        }
                        className="w-20 mx-auto text-center h-8 text-sm disabled:opacity-40"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={row.generalDiscountPct}
                        disabled={!row.discountApplicable}
                        onChange={(e) =>
                          updateRow(drug.id, { generalDiscountPct: e.target.value, dirty: true })
                        }
                        className="w-20 mx-auto text-center h-8 text-sm disabled:opacity-40"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={row.dirty ? 'default' : 'outline'}
                        disabled={!row.dirty || row.saving}
                        onClick={() => handleSaveRow(drug)}
                      >
                        {row.saving ? 'Saving…' : 'Save'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Lock, Download, RefreshCw, Loader2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ReportDefinition, ReportFormat, ReportParam } from '@/lib/reports/registry'

interface Report {
  id: string
  reportDefId: string
  name: string
  category: string
  format: string
  requestedByUser?: { name: string }
  requestedAt: string
  generatedAt?: string
  status: 'queued' | 'generating' | 'ready' | 'failed'
  statutory?: boolean
}

const TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'management', label: 'Management' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'gst', label: 'GST' },
  { value: 'trust', label: 'Trust' },
]

const CATEGORY_LABELS: Record<string, string> = {
  management: 'Management',
  compliance: 'Compliance',
  gst: 'GST',
  trust: 'Trust',
}

function GenerateDialog({
  open,
  onOpenChange,
  definitions,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  definitions: ReportDefinition[]
  onSubmit: (reportDefId: string, format: ReportFormat, params: Record<string, string>) => Promise<void>
}) {
  const [selectedDefId, setSelectedDefId] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat | ''>('')
  const [params, setParams] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const selectedDef = definitions.find((d) => d.id === selectedDefId)

  useEffect(() => {
    if (selectedDef) {
      setSelectedFormat(selectedDef.formats[0] ?? '')
      setParams({})
    }
  }, [selectedDefId])

  async function handleSubmit() {
    if (!selectedDef || !selectedFormat) return
    setSubmitting(true)
    try {
      await onSubmit(selectedDef.id, selectedFormat as ReportFormat, params)
      onOpenChange(false)
      setSelectedDefId('')
      setSelectedFormat('')
      setParams({})
    } finally {
      setSubmitting(false)
    }
  }

  const grouped = definitions.reduce<Record<string, ReportDefinition[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  const allParamsFilled = selectedDef?.params.every((p) => !p.required || !!params[p.key])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Report type */}
          <div className="space-y-1">
            <Label>Report Type</Label>
            <Select value={selectedDefId} onValueChange={setSelectedDefId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a report…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(grouped).map(([cat, defs]) => (
                  <SelectGroup key={cat}>
                    <SelectLabel>{CATEGORY_LABELS[cat] ?? cat}</SelectLabel>
                    {defs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.statutory ? ' 🔒' : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format radio */}
          {selectedDef && selectedDef.formats.length > 0 && (
            <div className="space-y-1">
              <Label>Format</Label>
              <div className="flex gap-3 flex-wrap">
                {selectedDef.formats.map((fmt) => (
                  <label key={fmt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="format"
                      value={fmt}
                      checked={selectedFormat === fmt}
                      onChange={() => setSelectedFormat(fmt)}
                      className="accent-blue-600"
                    />
                    <span className="uppercase font-mono">{fmt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic params */}
          {selectedDef?.params.map((param) => (
            <div key={param.key} className="space-y-1">
              <Label>
                {param.label}
                {param.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {param.type === 'date' && (
                <Input
                  type="date"
                  value={params[param.key] ?? ''}
                  onChange={(e) => setParams((p) => ({ ...p, [param.key]: e.target.value }))}
                />
              )}
              {param.type === 'month' && (
                <Input
                  type="month"
                  value={params[param.key] ?? ''}
                  onChange={(e) => setParams((p) => ({ ...p, [param.key]: e.target.value }))}
                />
              )}
              {param.type === 'year' && (
                <Input
                  type="number"
                  placeholder="e.g. 2025"
                  min={2000}
                  max={2100}
                  value={params[param.key] ?? ''}
                  onChange={(e) => setParams((p) => ({ ...p, [param.key]: e.target.value }))}
                />
              )}
              {param.type === 'date_range' && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={params[`${param.key}_from`] ?? ''}
                    onChange={(e) => setParams((p) => ({ ...p, [`${param.key}_from`]: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={params[`${param.key}_to`] ?? ''}
                    onChange={(e) => setParams((p) => ({ ...p, [`${param.key}_to`]: e.target.value }))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedDefId || !selectedFormat || !allParamsFilled}
          >
            {submitting ? 'Generating…' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [showGenerate, setShowGenerate] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  async function fetchReports() {
    try {
      const res = await fetch('/api/reports')
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch {
      // noop
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then((r) => r.json()),
      fetch('/api/reports/definitions').then((r) => r.json()),
    ])
      .then(([reps, defs]) => {
        setReports(Array.isArray(reps) ? reps : [])
        setDefinitions(Array.isArray(defs) ? defs : [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh when any report is active
  useEffect(() => {
    const hasActive = reports.some((r) => r.status === 'queued' || r.status === 'generating')
    if (hasActive) {
      intervalRef.current = setInterval(() => fetchReports(), 5000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [reports])

  async function handleGenerate(reportDefId: string, format: ReportFormat, params: Record<string, string>) {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportDefId, format, params }),
    })
    if (res.ok) {
      const created = await res.json()
      const def = definitions.find((d) => d.id === reportDefId)
      setReports((prev) => [
        {
          ...created,
          reportDefId,
          name: def?.name ?? reportDefId,
          category: def?.category ?? '',
          format,
          requestedAt: new Date().toISOString(),
          statutory: def?.statutory ?? false,
        },
        ...prev,
      ])
    }
  }

  async function handleRetry(reportId: string) {
    // Re-generate: PATCH or delete + recreate — here we just re-POST the same report
    // For simplicity, we just refresh the list
    await fetchReports()
  }

  const filtered = tab === 'all' ? reports : reports.filter((r) => r.category === tab)

  const statusBadgeMap: Record<string, string> = {
    queued: 'queued',
    generating: 'generating',
    ready: 'ready',
    failed: 'failed',
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        action={
          <Button onClick={() => setShowGenerate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Generate Report
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {TAB_OPTIONS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No reports found. Generate one to get started.
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Period / Params</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Generated At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <span className="flex items-center gap-1.5 font-medium text-slate-900">
                      {report.statutory && <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                      {report.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">—</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs uppercase text-slate-600">{report.format}</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {report.requestedByUser?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {report.generatedAt ? format(new Date(report.generatedAt), 'dd MMM yyyy HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {(report.status === 'queued' || report.status === 'generating') && (
                        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                      )}
                      <StatusBadge status={statusBadgeMap[report.status] ?? report.status.toLowerCase()} />
                    </span>
                  </TableCell>
                  <TableCell>
                    {report.status === 'ready' && (
                      <a href={`/api/reports/${report.id}/download`} download>
                        <Button size="sm" variant="outline" className="text-xs gap-1">
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </a>
                    )}
                    {report.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRetry(report.id)}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <GenerateDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        definitions={definitions}
        onSubmit={handleGenerate}
      />
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { LifeBuoy, Bug, Filter } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
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
import {
  TICKET_STATUSES,
  TICKET_SEVERITIES,
  TICKET_CATEGORIES,
  ticketStatusLabels,
  ticketSeverityLabels,
  ticketCategoryLabels,
} from '@/lib/validations/ticket'

interface Ticket {
  id:           string
  ticketNo:     string
  title:        string
  category:     string
  severity:     string
  status:       string
  reporterName: string
  reporterRole: string
  createdAt:    string
  updatedAt:    string
}

interface Session {
  user: { id: string; name: string; email: string; role: string }
}

const statusColor: Record<string, string> = {
  open:          'bg-blue-100 text-blue-800 border-blue-200',
  in_progress:   'bg-amber-100 text-amber-800 border-amber-200',
  awaiting_user: 'bg-purple-100 text-purple-800 border-purple-200',
  resolved:      'bg-green-100 text-green-800 border-green-200',
  closed:        'bg-slate-100 text-slate-700 border-slate-200',
}

const severityColor: Record<string, string> = {
  low:      'bg-slate-100 text-slate-700',
  medium:   'bg-blue-100 text-blue-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export default function SupportPage() {
  const [session, setSession]   = useState<Session | null>(null)
  const [tickets, setTickets]   = useState<Ticket[]>([])
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('all')
  const [severity, setSeverity] = useState('all')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then(setSession).catch(() => {})
  }, [])

  const isAdmin = session?.user.role === 'manager' || session?.user.role === 'super_admin'

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== 'all')   params.set('status',   status)
      if (severity !== 'all') params.set('severity', severity)
      if (category !== 'all') params.set('category', category)

      const res = await fetch(`/api/tickets?${params.toString()}`)
      if (res.ok) setTickets(await res.json())
    } finally {
      setLoading(false)
    }
  }, [status, severity, category])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Support Tickets' : 'My Support Tickets'}
        subtitle={
          isAdmin
            ? 'All bug reports and support requests from users. Click a ticket to manage it.'
            : 'Your reported bugs and questions. Use the "Report Bug" button on any page to file a new one.'
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{ticketStatusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {TICKET_SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>{ticketSeverityLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TICKET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{ticketCategoryLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(status !== 'all' || severity !== 'all' || category !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStatus('all'); setSeverity('all'); setCategory('all') }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-32">Ticket #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-28">Severity</TableHead>
              <TableHead className="w-32">Status</TableHead>
              {isAdmin && <TableHead className="w-40">Reporter</TableHead>}
              <TableHead className="w-36">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: isAdmin ? 7 : 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="p-0">
                  <EmptyState
                    icon={LifeBuoy}
                    title="No tickets yet"
                    description={
                      isAdmin
                        ? 'No support tickets have been submitted by users.'
                        : 'You haven\'t reported any bugs. Use the Report Bug button on any page.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50">
                  <TableCell className="font-mono text-xs text-slate-600">
                    <Link href={`/support/${t.id}`} className="hover:underline">{t.ticketNo}</Link>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    <Link href={`/support/${t.id}`} className="hover:underline flex items-center gap-2">
                      {t.category === 'bug' && <Bug className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                      <span>{t.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {ticketCategoryLabels[t.category as keyof typeof ticketCategoryLabels] ?? t.category}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${severityColor[t.severity] ?? severityColor.medium}`}>
                      {ticketSeverityLabels[t.severity as keyof typeof ticketSeverityLabels] ?? t.severity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor[t.status] ?? statusColor.open}`}>
                      {ticketStatusLabels[t.status as keyof typeof ticketStatusLabels] ?? t.status}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-sm text-slate-600">
                      <div className="font-medium text-slate-700">{t.reporterName}</div>
                      <div className="text-xs text-slate-400">{t.reporterRole.replace(/_/g, ' ')}</div>
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm')}
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

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Loader2, ChevronLeft, Bug, Monitor, GitCommit, Clock, User, Save,
  Paperclip, X, FileText, Image as ImageIcon, Download, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TICKET_STATUSES,
  TICKET_SEVERITIES,
  TICKET_CATEGORIES,
  ticketStatusLabels,
  ticketSeverityLabels,
  ticketCategoryLabels,
} from '@/lib/validations/ticket'

interface Ticket {
  id:               string
  ticketNo:         string
  title:            string
  description:      string
  stepsToReproduce: string | null
  expectedBehavior: string | null
  actualBehavior:   string | null
  category:         string
  severity:         string
  status:           string
  pageUrl:          string | null
  userAgent:        string | null
  screenSize:       string | null
  buildCommit:      string | null
  buildTime:        string | null
  reporterId:       string
  reporterName:     string
  reporterEmail:    string
  reporterRole:     string
  adminNotes:       string | null
  resolution:       string | null
  resolvedAt:       string | null
  resolvedBy:       string | null
  createdAt:        string
  updatedAt:        string
}

interface Attachment {
  id:          string
  filename:    string
  contentType: string
  sizeBytes:   number
  uploadedBy:  string
  uploadedAt:  string
}

const MAX_FILES        = 3
const MAX_FILE_BYTES   = 5 * 1024 * 1024
const ALLOWED_MIME_RE  = /^image\/(png|jpe?g|gif|webp)$|^application\/pdf$/

function fmtBytes(n: number) {
  if (n < 1024)         return `${n} B`
  if (n < 1024 * 1024)  return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  )
}

function MultilineBlock({ text }: { text: string | null }) {
  if (!text) return <span className="text-slate-400 italic text-sm">(none)</span>
  return (
    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
      {text}
    </pre>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket]   = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole]       = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  const [editStatus, setEditStatus]     = useState<string>('')
  const [editSeverity, setEditSeverity] = useState<string>('')
  const [editCategory, setEditCategory] = useState<string>('')
  const [adminNotes, setAdminNotes]     = useState('')
  const [resolution, setResolution]     = useState('')

  const [attachments, setAttachments]   = useState<Attachment[]>([])
  const [uploading, setUploading]       = useState(false)
  const attachInputRef                  = useRef<HTMLInputElement>(null)

  const isAdmin = role === 'manager' || role === 'super_admin'
  const canEditAttachments =
    isAdmin || (ticket && ticket.status !== 'resolved' && ticket.status !== 'closed')

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setRole(s?.user?.role ?? null))
      .catch(() => {})
  }, [])

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets/${id}`)
      if (!res.ok) {
        toast.error('Failed to load ticket')
        return
      }
      const data = await res.json()
      setTicket(data)
      setEditStatus(data.status)
      setEditSeverity(data.severity)
      setEditCategory(data.category)
      setAdminNotes(data.adminNotes ?? '')
      setResolution(data.resolution ?? '')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/attachments`)
      if (res.ok) setAttachments(await res.json())
    } catch {
      // non-fatal — ticket detail still loads
    }
  }, [id])

  useEffect(() => { fetchAttachments() }, [fetchAttachments])

  const handleUploadFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return

    // Client-side validation matching server limits — give immediate feedback
    const fileArray = Array.from(picked)
    const rejected: string[] = []
    const accepted: File[] = []
    const remainingSlots = MAX_FILES - attachments.length

    for (const f of fileArray) {
      if (accepted.length >= remainingSlots) {
        rejected.push(`${f.name}: only ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining`)
        continue
      }
      if (!ALLOWED_MIME_RE.test(f.type)) {
        rejected.push(`${f.name}: only PNG, JPEG, GIF, WebP, PDF allowed`)
        continue
      }
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`${f.name}: ${fmtBytes(f.size)} exceeds ${fmtBytes(MAX_FILE_BYTES)} limit`)
        continue
      }
      accepted.push(f)
    }

    if (rejected.length > 0) toast.warning(rejected.join(' • '))
    if (accepted.length === 0) {
      if (attachInputRef.current) attachInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      accepted.forEach((f) => fd.append('files', f))

      const res = await fetch(`/api/tickets/${id}/attachments`, {
        method: 'POST',
        body:   fd,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Upload failed (${res.status})`)
      }

      await fetchAttachments()
      toast.success(`Uploaded ${accepted.length} file${accepted.length === 1 ? '' : 's'}`)
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (attachInputRef.current) attachInputRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attId: string, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return
    try {
      const res = await fetch(`/api/tickets/${id}/attachments/${attId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Delete failed (${res.status})`)
      }
      setAttachments((current) => current.filter((a) => a.id !== attId))
      toast.success('Attachment deleted')
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed')
    }
  }

  const handleSave = async () => {
    if (!ticket) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:     editStatus,
          severity:   editSeverity,
          category:   editCategory,
          adminNotes,
          resolution,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to update ticket')
      }
      const updated = await res.json()
      setTicket(updated)
      toast.success('Ticket updated')
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Ticket not found or you do not have access.
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <Link
        href="/support"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
      >
        <ChevronLeft className="w-4 h-4" /> Back to tickets
      </Link>

      <PageHeader
        title={ticket.title}
        subtitle={ticket.ticketNo}
        breadcrumb={[
          { label: 'Support', href: '/support' },
          { label: ticket.ticketNo },
        ]}
      />

      {/* ── Status / severity / category strip ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor[ticket.status] ?? statusColor.open}`}>
          {ticketStatusLabels[ticket.status as keyof typeof ticketStatusLabels] ?? ticket.status}
        </span>
        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-medium ${severityColor[ticket.severity] ?? severityColor.medium}`}>
          {ticketSeverityLabels[ticket.severity as keyof typeof ticketSeverityLabels] ?? ticket.severity} severity
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Bug className="w-3.5 h-3.5" />
          {ticketCategoryLabels[ticket.category as keyof typeof ticketCategoryLabels] ?? ticket.category}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main content (LEFT 2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Description</h3>
            <MultilineBlock text={ticket.description} />
          </div>

          {(ticket.stepsToReproduce || ticket.expectedBehavior || ticket.actualBehavior) && (
            <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-5">
              {ticket.stepsToReproduce && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Steps to Reproduce</h3>
                  <MultilineBlock text={ticket.stepsToReproduce} />
                </div>
              )}
              {(ticket.expectedBehavior || ticket.actualBehavior) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Expected</h3>
                    <MultilineBlock text={ticket.expectedBehavior} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Actual</h3>
                    <MultilineBlock text={ticket.actualBehavior} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Attachments ───────────────────────────────────────────── */}
          {(attachments.length > 0 || canEditAttachments) && (
            <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  Attachments
                  {attachments.length > 0 && (
                    <span className="text-xs text-slate-500 font-normal">
                      ({attachments.length}/{MAX_FILES})
                    </span>
                  )}
                </h3>

                {canEditAttachments && (
                  <>
                    <input
                      ref={attachInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUploadFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading || attachments.length >= MAX_FILES}
                      onClick={() => attachInputRef.current?.click()}
                    >
                      {uploading ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading…</>
                      ) : (
                        <><Paperclip className="w-3.5 h-3.5 mr-1.5" /> Add Files</>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {attachments.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No attachments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {attachments.map((a) => {
                    const url     = `/api/tickets/${id}/attachments/${a.id}`
                    const isImage = a.contentType.startsWith('image/')
                    return (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 p-3 rounded-md border border-slate-200 bg-slate-50"
                      >
                        {isImage ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 block w-20 h-20 rounded border border-slate-200 overflow-hidden bg-white hover:border-blue-400 transition"
                            title="Open full size"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={a.filename}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex-shrink-0 w-20 h-20 rounded border border-slate-200 bg-white flex items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline block truncate"
                          >
                            {a.filename}
                          </a>
                          <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                            <div>{fmtBytes(a.sizeBytes)} · {a.contentType}</div>
                            <div>Uploaded {format(new Date(a.uploadedAt), 'dd MMM yyyy, HH:mm')}</div>
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            <a
                              href={url}
                              download={a.filename}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                            {canEditAttachments && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(a.id, a.filename)}
                                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {canEditAttachments && attachments.length < MAX_FILES && (
                <p className="text-[11px] text-slate-400">
                  Up to {MAX_FILES} files, max {fmtBytes(MAX_FILE_BYTES)} each. PNG, JPEG, GIF, WebP, or PDF only.
                </p>
              )}
            </div>
          )}

          {/* ── Admin section ─────────────────────────────────────────── */}
          {isAdmin && (
            <div className="bg-white rounded-lg border-2 border-blue-200 p-5 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <Save className="w-4 h-4" /> Admin Actions
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ticketStatusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Severity</Label>
                  <Select value={editSeverity} onValueChange={setEditSeverity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>{ticketSeverityLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{ticketCategoryLabels[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Admin Notes (internal — not shown to user)</Label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Investigation notes, root cause, next steps..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Resolution (visible to the reporter)</Label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  placeholder="What was fixed and how the user can verify..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  ) : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}

          {/* Non-admin: show resolution if present */}
          {!isAdmin && ticket.resolution && (
            <div className="bg-green-50 rounded-lg border border-green-200 p-5">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Resolution</h3>
              <p className="text-sm text-green-900 whitespace-pre-wrap">{ticket.resolution}</p>
              {ticket.resolvedAt && (
                <p className="text-xs text-green-700 mt-2">
                  Resolved {format(new Date(ticket.resolvedAt), 'dd MMM yyyy, HH:mm')}
                  {ticket.resolvedBy && ` by ${ticket.resolvedBy}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar (RIGHT 1/3) — meta + diagnostic context ──────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Reporter</h3>
            <dl className="space-y-3">
              <Field label="Name">
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.reporterName}
                </span>
              </Field>
              <Field label="Email">
                <a href={`mailto:${ticket.reporterEmail}`} className="text-blue-600 hover:underline">
                  {ticket.reporterEmail}
                </a>
              </Field>
              <Field label="Role">
                <span className="capitalize">{ticket.reporterRole.replace(/_/g, ' ')}</span>
              </Field>
            </dl>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Diagnostic Info</h3>
            <dl className="space-y-3">
              <Field label="Submitted">
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </Field>
              {ticket.pageUrl && (
                <Field label="Page URL">
                  <a
                    href={ticket.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all text-xs"
                  >
                    {ticket.pageUrl}
                  </a>
                </Field>
              )}
              {ticket.buildCommit && (
                <Field label="App Build">
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                    {ticket.buildCommit}
                  </span>
                  {ticket.buildTime && (
                    <span className="text-xs text-slate-500 block mt-0.5">
                      built {format(new Date(ticket.buildTime), 'dd MMM, HH:mm')}
                    </span>
                  )}
                </Field>
              )}
              {ticket.screenSize && (
                <Field label="Screen">
                  <span className="flex items-center gap-2 text-xs">
                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                    {ticket.screenSize}
                  </span>
                </Field>
              )}
              {ticket.userAgent && (
                <Field label="Browser">
                  <span className="text-xs text-slate-600 break-words">{ticket.userAgent}</span>
                </Field>
              )}
            </dl>
          </div>

          {isAdmin && ticket.resolution && (
            <div className="bg-green-50 rounded-lg border border-green-200 p-5">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Resolution Posted</h3>
              <p className="text-sm text-green-900 whitespace-pre-wrap">{ticket.resolution}</p>
              {ticket.resolvedAt && (
                <p className="text-xs text-green-700 mt-2">
                  {format(new Date(ticket.resolvedAt), 'dd MMM yyyy, HH:mm')}
                  {ticket.resolvedBy && ` · ${ticket.resolvedBy}`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

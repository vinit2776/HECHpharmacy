'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TICKET_CATEGORIES,
  TICKET_SEVERITIES,
  ticketCategoryLabels,
  ticketSeverityLabels,
} from '@/lib/validations/ticket'

interface FormState {
  title:            string
  category:         (typeof TICKET_CATEGORIES)[number]
  severity:         (typeof TICKET_SEVERITIES)[number]
  description:      string
  stepsToReproduce: string
  expectedBehavior: string
  actualBehavior:   string
}

const EMPTY: FormState = {
  title:            '',
  category:         'bug',
  severity:         'medium',
  description:      '',
  stepsToReproduce: '',
  expectedBehavior: '',
  actualBehavior:   '',
}

// File upload constants — must match server-side limits in
// src/app/api/tickets/[id]/attachments/route.ts
const MAX_FILES        = 3
const MAX_FILE_BYTES   = 5 * 1024 * 1024
const ALLOWED_MIME_RE  = /^image\/(png|jpe?g|gif|webp)$|^application\/pdf$/

function fmtBytes(n: number) {
  if (n < 1024)         return `${n} B`
  if (n < 1024 * 1024)  return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function BugReportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [form, setForm]       = useState<FormState>(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [files, setFiles]     = useState<File[]>([])
  const fileInputRef          = useRef<HTMLInputElement>(null)

  // Reset whenever closed so reopening starts fresh
  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setShowMore(false)
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  const handleFilesPicked = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return

    const next = [...files]
    const rejected: string[] = []

    for (const f of Array.from(picked)) {
      if (next.length >= MAX_FILES) {
        rejected.push(`${f.name}: limit of ${MAX_FILES} files reached`)
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
      // Skip exact duplicates (same name + size)
      if (next.some((existing) => existing.name === f.name && existing.size === f.size)) continue

      next.push(f)
    }

    setFiles(next)
    if (rejected.length > 0) toast.warning(rejected.join(' • '))

    // Reset input so picking the same file again triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (idx: number) => {
    setFiles((current) => current.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    // Auto-capture browser context — invaluable for the developer.
    const ctx = {
      pageUrl:     typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent:   typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      screenSize:
        typeof window !== 'undefined'
          ? `${window.innerWidth}×${window.innerHeight} (DPR ${window.devicePixelRatio})`
          : undefined,
      buildCommit: process.env.NEXT_PUBLIC_BUILD_COMMIT,
      buildTime:   process.env.NEXT_PUBLIC_BUILD_TIME,
    }

    setSaving(true)
    try {
      const res = await fetch('/api/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:            form.title.trim(),
          description:      form.description.trim(),
          category:         form.category,
          severity:         form.severity,
          stepsToReproduce: form.stepsToReproduce.trim() || undefined,
          expectedBehavior: form.expectedBehavior.trim() || undefined,
          actualBehavior:   form.actualBehavior.trim()   || undefined,
          ...ctx,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        const msg = body.issues
          ? body.issues.map((i: any) => i.message).join(', ')
          : (body.error ?? 'Failed to submit ticket')
        throw new Error(msg)
      }

      const ticket = await res.json()

      // Upload attachments (if any) in a follow-up multipart request.
      // The ticket exists at this point even if uploads fail — user can
      // re-upload from the detail page.
      let uploadWarning: string | null = null
      if (files.length > 0) {
        const fd = new FormData()
        files.forEach((f) => fd.append('files', f))

        try {
          const upRes = await fetch(`/api/tickets/${ticket.id}/attachments`, {
            method: 'POST',
            body:   fd,
          })
          if (!upRes.ok) {
            const upBody = await upRes.json().catch(() => ({}))
            uploadWarning = upBody.error ?? `Attachment upload failed (${upRes.status})`
          }
        } catch (e: any) {
          uploadWarning = e.message ?? 'Attachment upload failed'
        }
      }

      if (uploadWarning) {
        toast.warning(
          `Ticket ${ticket.ticketNo} created, but attachments failed: ${uploadWarning}. You can re-upload from the ticket page.`,
          { duration: 8000 },
        )
      } else {
        const fileNote = files.length > 0 ? ` (${files.length} file${files.length === 1 ? '' : 's'} attached)` : ''
        toast.success(`Ticket ${ticket.ticketNo} submitted${fileNote}. We'll review it shortly.`, {
          duration: 5000,
        })
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message ?? 'Could not submit ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Bug or Issue</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. We auto-capture the page URL, your browser, and
            the app build version to help our developer fix it faster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bt-title" className="text-sm">
              What happened? <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bt-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Short summary, e.g. Bill PDF cuts off the right column"
              maxLength={200}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Type</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as any }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{ticketCategoryLabels[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((f) => ({ ...f, severity: v as any }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>{ticketSeverityLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bt-desc" className="text-sm">
              Describe the problem <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="bt-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              required
              placeholder="What you were doing, what you saw, anything unusual..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {!showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add reproduction steps (optional, helps us fix faster)
            </button>
          )}

          {showMore && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="bt-steps" className="text-sm">Steps to reproduce</Label>
                <textarea
                  id="bt-steps"
                  value={form.stepsToReproduce}
                  onChange={(e) => setForm((f) => ({ ...f, stepsToReproduce: e.target.value }))}
                  rows={3}
                  placeholder={'1. Go to ...\n2. Click ...\n3. See error ...'}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bt-expected" className="text-sm">Expected behavior</Label>
                  <textarea
                    id="bt-expected"
                    value={form.expectedBehavior}
                    onChange={(e) => setForm((f) => ({ ...f, expectedBehavior: e.target.value }))}
                    rows={2}
                    placeholder="What should have happened?"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bt-actual" className="text-sm">Actual behavior</Label>
                  <textarea
                    id="bt-actual"
                    value={form.actualBehavior}
                    onChange={(e) => setForm((f) => ({ ...f, actualBehavior: e.target.value }))}
                    rows={2}
                    placeholder="What actually happened?"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Attachments ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm">
              Attachments <span className="text-slate-400 font-normal">(optional — screenshot of the issue is super helpful)</span>
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFilesPicked(e.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_FILES}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Paperclip className="w-4 h-4" />
              {files.length === 0
                ? 'Attach screenshots or PDFs'
                : files.length >= MAX_FILES
                  ? `Maximum ${MAX_FILES} files attached`
                  : `Add another file (${files.length}/${MAX_FILES})`}
            </button>

            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((f, idx) => {
                  const isImage = f.type.startsWith('image/')
                  const Icon = isImage ? ImageIcon : FileText
                  return (
                    <li
                      key={`${f.name}-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm"
                    >
                      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 truncate font-medium text-slate-700">{f.name}</span>
                      <span className="text-xs text-slate-500 flex-shrink-0">{fmtBytes(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-red-600 flex-shrink-0"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="text-[11px] text-slate-400">
              Up to {MAX_FILES} files, max {fmtBytes(MAX_FILE_BYTES)} each. PNG, JPEG, GIF, WebP, or PDF only.
            </p>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
            We&apos;ll automatically include: current page URL, your browser, screen
            size, and the app build version. Your name and email are taken from
            your login — no need to type them.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
              ) : (
                'Submit Ticket'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

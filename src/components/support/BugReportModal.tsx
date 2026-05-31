'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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

  // Reset whenever closed so reopening starts fresh
  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setShowMore(false)
    }
  }, [open])

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
      toast.success(`Ticket ${ticket.ticketNo} submitted. We'll review it shortly.`, {
        duration: 5000,
      })
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

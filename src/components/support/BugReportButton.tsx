'use client'

import { useState } from 'react'
import { Bug } from 'lucide-react'
import { BugReportModal } from './BugReportModal'

export function BugReportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all print:hidden opacity-60 hover:opacity-100"
        title="Report a bug or request a feature"
        aria-label="Report a bug"
      >
        <Bug className="w-4 h-4" />
        <span className="hidden sm:inline">Report Bug</span>
      </button>

      <BugReportModal open={open} onOpenChange={setOpen} />
    </>
  )
}

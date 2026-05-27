'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type BannerVariant = 'draft' | 'active' | 'pending' | 'confirmed' | 'approved' | 'rejected' | 'cancelled' | 'ready' | 'failed' | 'queued' | 'generating' | string

const variantConfig: Record<string, { dot: string; bg: string; text: string }> = {
  draft: { dot: 'bg-slate-400', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
  queued: { dot: 'bg-slate-400', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
  inactive: { dot: 'bg-slate-400', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
  active: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  confirmed: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  approved: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  ready: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  generating: { dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  pending: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
  pending_approval: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
  cancelled: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
  rejected: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
  failed: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
}

interface BannerAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'destructive'
}

interface LifecycleBannerProps {
  status: BannerVariant
  statusLabel?: string
  message: string
  actions?: BannerAction[]
  className?: string
}

export function LifecycleBanner({ status, statusLabel, message, actions, className }: LifecycleBannerProps) {
  const config = variantConfig[status] ?? variantConfig.draft

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border mb-6', config.bg, className)}>
      <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', config.dot)} />
      <span className={cn('text-sm font-semibold uppercase tracking-wide flex-shrink-0', config.text)}>
        {statusLabel ?? status.replace(/_/g, ' ')}
      </span>
      <span className={cn('text-sm flex-1', config.text)}>{message}</span>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant ?? 'outline'}
              onClick={action.onClick}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

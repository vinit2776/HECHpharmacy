import { cn } from '@/lib/utils'

type StatusVariant =
  | 'draft'
  | 'active'
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'returned'
  | 'ready'
  | 'failed'
  | 'queued'
  | 'generating'
  | 'low_stock'
  | 'out_of_stock'
  | 'near_expiry'
  | 'expired'
  | 'quarantined'
  | 'available'
  | 'inactive'
  | 'bpl'
  | 'general'
  | string

const variantStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  queued: 'bg-slate-100 text-slate-700 border-slate-200',
  quarantined: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  available: 'bg-green-100 text-green-800 border-green-200',
  generating: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  near_expiry: 'bg-amber-100 text-amber-800 border-amber-200',
  bpl: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  out_of_stock: 'bg-red-100 text-red-800 border-red-200',
  returned: 'bg-red-100 text-red-800 border-red-200',
  low_stock: 'bg-orange-100 text-orange-800 border-orange-200',
  general: 'bg-slate-100 text-slate-700 border-slate-200',
}

const variantLabels: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  pending: 'Pending Approval',
  confirmed: 'Confirmed',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  returned: 'Returned',
  ready: 'Ready',
  failed: 'Failed',
  queued: 'Queued',
  generating: 'Generating…',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  near_expiry: 'Near Expiry',
  expired: 'Expired',
  quarantined: 'Quarantined',
  available: 'Available',
  inactive: 'Inactive',
  bpl: 'BPL',
  general: 'General',
  pending_approval: 'Pending Approval',
}

interface StatusBadgeProps {
  status: StatusVariant
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = variantStyles[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
  const displayLabel = label ?? variantLabels[status] ?? status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        style,
        className
      )}
    >
      {displayLabel}
    </span>
  )
}

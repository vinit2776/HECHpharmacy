'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface DateRangePickerProps {
  fromDate: string
  toDate: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  label?: string
}

export function DateRangePicker({ fromDate, toDate, onFromChange, onToChange, label }: DateRangePickerProps) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <Label className="text-xs text-slate-500 mb-1 block">{label ?? 'From'}</Label>
        <Input type="date" value={fromDate} onChange={(e) => onFromChange(e.target.value)} />
      </div>
      <div className="flex-1">
        <Label className="text-xs text-slate-500 mb-1 block">To</Label>
        <Input type="date" value={toDate} onChange={(e) => onToChange(e.target.value)} />
      </div>
    </div>
  )
}

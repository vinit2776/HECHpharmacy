'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

interface TopBarProps {
  userName: string
  userRole: string
}

const roleLabels: Record<string, string> = {
  counter_pharmacist: 'Counter Pharmacist',
  purchase_pharmacist: 'Purchase Pharmacist',
  manager: 'Manager',
  super_admin: 'Super Admin',
}

export function TopBar({ userName, userRole }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 fixed top-0 right-0 left-60 z-10">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-right">
            <p className="font-medium text-slate-900 leading-none">{userName}</p>
            <p className="text-xs text-slate-500 leading-none mt-0.5">{roleLabels[userRole] ?? userRole}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-slate-500 hover:text-slate-900"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}

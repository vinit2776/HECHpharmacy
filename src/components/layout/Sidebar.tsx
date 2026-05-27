'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Pill,
  Truck,
  UserRound,
  RotateCcw,
  FileText,
  BarChart3,
  Settings,
  Eye,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: any
  roles: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'super_admin'] },
  { href: '/billing', label: 'Billing', icon: ShoppingCart, roles: ['counter_pharmacist', 'manager', 'super_admin'] },
  { href: '/purchasing', label: 'Purchasing', icon: Package, roles: ['purchase_pharmacist', 'manager', 'super_admin'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['counter_pharmacist', 'purchase_pharmacist', 'manager', 'super_admin'] },
  { href: '/patients', label: 'Patients', icon: Users, roles: ['counter_pharmacist', 'manager', 'super_admin'] },
  { href: '/drugs', label: 'Drugs', icon: Pill, roles: ['counter_pharmacist', 'purchase_pharmacist', 'manager', 'super_admin'] },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['purchase_pharmacist', 'manager', 'super_admin'] },
  { href: '/doctors', label: 'Doctors', icon: UserRound, roles: ['counter_pharmacist', 'manager', 'super_admin'] },
  { href: '/returns/sales', label: 'Sales Returns', icon: RotateCcw, roles: ['counter_pharmacist', 'manager', 'super_admin'] },
  { href: '/returns/purchases', label: 'Purchase Returns', icon: RotateCcw, roles: ['purchase_pharmacist', 'manager', 'super_admin'] },
  { href: '/registers/form17', label: 'Form 17', icon: FileText, roles: ['manager', 'super_admin'] },
  { href: '/registers/form18', label: 'Form 18', icon: FileText, roles: ['manager', 'super_admin'] },
  { href: '/registers/h1', label: 'H1 Register', icon: FileText, roles: ['manager', 'super_admin'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['manager', 'super_admin'] },
  { href: '/settings/users', label: 'Users', icon: Settings, roles: ['super_admin'] },
  { href: '/settings/discounts', label: 'Discounts', icon: Settings, roles: ['manager', 'super_admin'] },
]

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-700">
        <Eye className="w-6 h-6 text-blue-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold leading-tight">Eye Hospital</p>
          <p className="text-xs text-slate-400 leading-tight">Pharmacy</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          {userRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      </div>
    </aside>
  )
}

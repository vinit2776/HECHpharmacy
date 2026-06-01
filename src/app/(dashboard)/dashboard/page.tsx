'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, Receipt, Wallet, Tag, ShoppingCart, FileText, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const inrFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

interface DashboardStats {
  billsCountToday: number
  netCollectedToday: number
  discountGivenToday: number
  collectionsByPaymentMode: Record<string, { count: number; total: number }>
  pendingSalesReturnsCount: number
  pendingPurchaseReturnsCount: number
  lowStockDrugCount: number
  nearExpiryBatchesCount: number
  h1SugamPendingCount: number
}

function StatCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const actionRequired =
    stats &&
    (stats.pendingSalesReturnsCount > 0 ||
      stats.pendingPurchaseReturnsCount > 0 ||
      stats.h1SugamPendingCount > 0)

  // Compute payment mode breakdown %
  const totalCollected = stats?.netCollectedToday ?? 0
  const paymentModes = stats?.collectionsByPaymentMode ? Object.entries(stats.collectionsByPaymentMode) : []

  return (
    <div>
      <PageHeader title="Dashboard" />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: 4 stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Sales */}
            <StatCard title="Today's Sales" icon={TrendingUp}>
              <p className="text-2xl font-bold text-slate-900">
                {inrFormat.format(stats?.netCollectedToday ?? 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Net amount collected</p>
            </StatCard>

            {/* Card 2: Today's Discount */}
            <StatCard title="Today's Discount" icon={Tag}>
              <p className="text-2xl font-bold text-slate-900">
                {inrFormat.format(stats?.discountGivenToday ?? 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total discount given</p>
            </StatCard>

            {/* Card 3: Bills Today */}
            <StatCard title="Bills Today" icon={Receipt}>
              <p className="text-2xl font-bold text-slate-900">{stats?.billsCountToday ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Bills processed</p>
            </StatCard>

            {/* Card 4: Collections by payment mode */}
            <StatCard title="Collections" icon={Wallet}>
              {paymentModes.length === 0 ? (
                <p className="text-sm text-slate-400">No data</p>
              ) : (
                <div className="space-y-1">
                  {paymentModes.map(([mode, info]) => {
                    const pct = totalCollected > 0 ? Math.round((info.total / totalCollected) * 100) : 0
                    return (
                      <div key={mode} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 capitalize">{mode}</span>
                        <span className="font-medium text-slate-900">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </StatCard>
          </div>

          {/* Action Required section */}
          {actionRequired && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-800">Action Required</h2>
              </div>
              <div className="space-y-2">
                {stats!.pendingSalesReturnsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-800">
                      {stats!.pendingSalesReturnsCount} pending sales return{stats!.pendingSalesReturnsCount !== 1 ? 's' : ''}
                    </span>
                    <Link
                      href="/returns/sales"
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
                    >
                      Review Returns →
                    </Link>
                  </div>
                )}
                {stats!.pendingPurchaseReturnsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-800">
                      {stats!.pendingPurchaseReturnsCount} pending purchase return{stats!.pendingPurchaseReturnsCount !== 1 ? 's' : ''}
                    </span>
                    <Link
                      href="/returns/purchases"
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
                    >
                      Review Returns →
                    </Link>
                  </div>
                )}
                {stats!.h1SugamPendingCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-800">
                      {stats!.h1SugamPendingCount} H1 Sugam entry{stats!.h1SugamPendingCount !== 1 ? 'ies' : ''} pending upload
                    </span>
                    <Link
                      href="/registers/h1"
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
                    >
                      View H1 Register →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats && stats.lowStockDrugCount > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    {stats.lowStockDrugCount} drug{stats.lowStockDrugCount !== 1 ? 's' : ''} low on stock
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">Below reorder level</p>
                </div>
                <Link
                  href="/inventory?status=low_stock"
                  className="text-sm font-medium text-orange-700 hover:text-orange-900 underline underline-offset-2 flex-shrink-0"
                >
                  View Inventory →
                </Link>
              </div>
            )}
            {stats && stats.nearExpiryBatchesCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.nearExpiryBatchesCount} batch{stats.nearExpiryBatchesCount !== 1 ? 'es' : ''} near expiry
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">Expiring within 30 days</p>
                </div>
                <Link
                  href="/inventory?status=near_expiry"
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 flex-shrink-0"
                >
                  View Near-Expiry →
                </Link>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/purchasing/grns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              + New Purchase (GRN)
            </Link>
            <Link
              href="/billing/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              Bill History
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Report Centre
            </Link>
            <Link
              href="/registers"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Registers
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

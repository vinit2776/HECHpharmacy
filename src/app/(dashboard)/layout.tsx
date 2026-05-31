import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BugReportButton } from '@/components/support/BugReportButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const userRole = session.user.role ?? 'counter_pharmacist'
  const userName = session.user.name ?? 'User'

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col ml-60">
        <TopBar userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="p-6">{children}</div>
        </main>
      </div>
      <BugReportButton />
    </div>
  )
}

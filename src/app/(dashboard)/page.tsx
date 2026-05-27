import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootDashboardPage() {
  const session = await auth()
  const role = session?.user.role

  if (role === 'manager' || role === 'super_admin') {
    redirect('/dashboard')
  } else if (role === 'counter_pharmacist') {
    redirect('/billing')
  } else if (role === 'purchase_pharmacist') {
    redirect('/purchasing')
  }

  redirect('/login')
}

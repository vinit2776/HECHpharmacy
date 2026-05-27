'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCog, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  isActive: boolean
}

const defaultForm = {
  name: '',
  email: '',
  password: '',
  role: 'counter_pharmacist',
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  counter_pharmacist: 'Counter Pharmacist',
  purchase_pharmacist: 'Purchase Pharmacist',
}

const roleStyles: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  counter_pharmacist: 'bg-slate-100 text-slate-700 border-slate-200',
  purchase_pharmacist: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function UsersPage() {
  const [sessionRole, setSessionRole] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Check session role
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        setSessionRole(data?.user?.role ?? null)
      })
      .catch(() => setSessionRole(null))
      .finally(() => setSessionLoading(false))
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const res = await fetch('/api/users')
      if (res.status === 404) {
        setApiError('User management API not configured')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to fetch users')
      }
      const data: User[] = await res.json()
      setUsers(data)
    } catch (e: any) {
      setApiError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionRole === 'super_admin') {
      fetchUsers()
    }
  }, [sessionRole, fetchUsers])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!form.email.trim()) {
      setFormError('Email is required')
      return
    }
    if (!form.password.trim() || form.password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to create user')
      }
      toast.success('User created successfully')
      setDialogOpen(false)
      setForm(defaultForm)
      fetchUsers()
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    setTogglingId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to update user')
      }
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update user')
    } finally {
      setTogglingId(null)
    }
  }

  if (sessionLoading) {
    return (
      <div>
        <PageHeader title="User Management" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (sessionRole !== 'super_admin') {
    return (
      <div>
        <PageHeader
          title="User Management"
          breadcrumb={[{ label: 'Settings' }, { label: 'User Management' }]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Only Super Admins can manage users. Contact your administrator for access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage system users and their access roles"
        breadcrumb={[{ label: 'Settings' }, { label: 'User Management' }]}
        action={
          <Button
            onClick={() => {
              setForm(defaultForm)
              setFormError(null)
              setDialogOpen(true)
            }}
          >
            + Add User
          </Button>
        }
      />

      {apiError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-4">
          {apiError}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 && !apiError ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={UserCog}
                    title="No users found"
                    description="Add your first user to get started"
                    actionLabel="Add User"
                    onAction={() => {
                      setForm(defaultForm)
                      setFormError(null)
                      setDialogOpen(true)
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-slate-900">{user.name}</TableCell>
                  <TableCell className="text-slate-600">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        roleStyles[user.role] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(new Date(user.createdAt), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(user)}
                      disabled={togglingId === user.id}
                    >
                      {togglingId === user.id
                        ? 'Updating…'
                        : user.isActive
                        ? 'Deactivate'
                        : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="u-name">Name *</Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email *</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-password">Password *</Label>
              <Input
                id="u-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counter_pharmacist">Counter Pharmacist</SelectItem>
                  <SelectItem value="purchase_pharmacist">Purchase Pharmacist</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

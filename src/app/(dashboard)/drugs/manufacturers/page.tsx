'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface Manufacturer {
  id: string
  code: string
  name: string
  _count: { drugs: number }
}

export default function ManufacturersPage() {
  const [list, setList] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addCode, setAddCode] = useState('')
  const [addName, setAddName] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Manufacturer | null>(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/manufacturers')
      if (!res.ok) throw new Error('Failed to load')
      setList(await res.json())
    } catch {
      toast.error('Failed to load manufacturers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddSaving(true)
    try {
      const res = await fetch('/api/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: addCode.trim().toUpperCase(), name: addName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      toast.success('Manufacturer added')
      setAddOpen(false)
      setAddCode('')
      setAddName('')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAddSaving(false)
    }
  }

  function openEdit(m: Manufacturer) {
    setEditTarget(m)
    setEditName(m.name)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/manufacturers/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      toast.success('Manufacturer updated')
      setEditTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(m: Manufacturer) {
    if (!confirm(`Delete manufacturer "${m.code} — ${m.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/manufacturers/${m.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete')
      toast.success('Manufacturer deleted')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Manufacturers"
        breadcrumb={[
          { label: 'Drugs', href: '/drugs' },
          { label: 'Manufacturers' },
        ]}
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Manufacturer
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No manufacturers yet. Add one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-28">Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 w-24">Drugs</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{m.code}</td>
                  <td className="px-4 py-3 text-slate-700">{m.name}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{m._count.drugs}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(m)}
                        disabled={m._count.drugs > 0}
                        title={m._count.drugs > 0 ? 'Cannot delete — drugs are linked' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Manufacturer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code <span className="text-red-500">*</span></Label>
              <Input
                value={addCode}
                onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                placeholder="e.g. ALL"
                maxLength={10}
                required
              />
              <p className="text-xs text-slate-500">Short unique code, max 10 chars (e.g. ALL for Alkem)</p>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Alkem Laboratories Ltd"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addSaving}>{addSaving ? 'Saving…' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Manufacturer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={editTarget?.code ?? ''} disabled className="bg-slate-50 font-mono" />
              <p className="text-xs text-slate-500">Code cannot be changed once set</p>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

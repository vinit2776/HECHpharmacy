'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  ShieldAlert,
  Save,
  Loader2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Hash,
  Landmark,
  Receipt,
} from 'lucide-react'

import { PageHeader }  from '@/components/shared/PageHeader'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { Skeleton }    from '@/components/ui/skeleton'
import { Separator }   from '@/components/ui/separator'

// ─── types ───────────────────────────────────────────────────────────────────

interface PharmacySettings {
  pharmacyName:  string
  address:       string
  city:          string
  state:         string
  pincode:       string
  phone:         string
  email:         string
  gstin:         string
  drugLicenseNo: string
  cinNo:         string
  panNo:         string
}

const EMPTY: PharmacySettings = {
  pharmacyName:  '',
  address:       '',
  city:          '',
  state:         '',
  pincode:       '',
  phone:         '',
  email:         '',
  gstin:         '',
  drugLicenseNo: '',
  cinNo:         '',
  panNo:         '',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input {...inputProps} />
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PharmacySettingsPage() {
  const [sessionRole, setSessionRole]   = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [form, setForm]                 = useState<PharmacySettings>(EMPTY)
  const [dirty, setDirty]               = useState(false)

  // Fetch session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => setSessionRole(d?.user?.role ?? null))
      .catch(() => setSessionRole(null))
      .finally(() => setSessionLoading(false))
  }, [])

  // Fetch settings once we know we have access
  useEffect(() => {
    if (sessionRole !== 'manager' && sessionRole !== 'super_admin') return
    fetch('/api/settings/pharmacy')
      .then((r) => r.json())
      .then((data) => {
        setForm({
          pharmacyName:  data.pharmacyName  ?? '',
          address:       data.address       ?? '',
          city:          data.city          ?? '',
          state:         data.state         ?? '',
          pincode:       data.pincode       ?? '',
          phone:         data.phone         ?? '',
          email:         data.email         ?? '',
          gstin:         data.gstin         ?? '',
          drugLicenseNo: data.drugLicenseNo ?? '',
          cinNo:         data.cinNo         ?? '',
          panNo:         data.panNo         ?? '',
        })
      })
      .catch(() => toast.error('Failed to load pharmacy settings'))
      .finally(() => setLoading(false))
  }, [sessionRole])

  const set = (key: keyof PharmacySettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
      setDirty(true)
    }

  const handleSave = async () => {
    if (!form.pharmacyName.trim()) {
      toast.error('Pharmacy name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/pharmacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      toast.success('Pharmacy settings saved')
      setDirty(false)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // ── loading skeleton ────────────────────────────────────────────────────────
  if (sessionLoading || (loading && sessionRole !== null)) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader
          title="Pharmacy Profile"
          breadcrumb={[{ label: 'Settings' }, { label: 'Pharmacy Profile' }]}
        />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // ── access denied ───────────────────────────────────────────────────────────
  if (sessionRole !== 'manager' && sessionRole !== 'super_admin') {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Pharmacy Profile"
          breadcrumb={[{ label: 'Settings' }, { label: 'Pharmacy Profile' }]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Only Managers and Super Admins can update pharmacy details.
          </p>
        </div>
      </div>
    )
  }

  // ── form ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <PageHeader
        title="Pharmacy Profile"
        subtitle="Details printed on every bill and compliance register"
        breadcrumb={[{ label: 'Settings' }, { label: 'Pharmacy Profile' }]}
        action={
          <Button onClick={handleSave} disabled={!dirty || saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        }
      />

      {/* Basic identity */}
      <Section icon={Building2} title="Pharmacy Identity">
        <div className="sm:col-span-2">
          <Field
            label="Pharmacy / Hospital Name"
            required
            value={form.pharmacyName}
            onChange={set('pharmacyName')}
            placeholder="HCEH Eye Hospital Pharmacy"
            hint="Appears as the header on every printed bill"
          />
        </div>
      </Section>

      {/* Address */}
      <Section icon={MapPin} title="Address">
        <div className="sm:col-span-2">
          <Field
            label="Street Address"
            value={form.address}
            onChange={set('address')}
            placeholder="120, Mount Road"
          />
        </div>
        <Field
          label="City"
          value={form.city}
          onChange={set('city')}
          placeholder="Chennai"
        />
        <Field
          label="State"
          value={form.state}
          onChange={set('state')}
          placeholder="Tamil Nadu"
        />
        <Field
          label="Pincode"
          value={form.pincode}
          onChange={set('pincode')}
          placeholder="600 002"
          maxLength={6}
        />
      </Section>

      {/* Contact */}
      <Section icon={Phone} title="Contact">
        <Field
          label="Phone"
          type="tel"
          inputMode="numeric"
          maxLength={15}
          value={form.phone}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 15)
            setForm((prev) => ({ ...prev, phone: digits }))
            setDirty(true)
          }}
          placeholder="Phone number (up to 15 digits)"
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="pharmacy@hceh.in"
        />
      </Section>

      {/* Tax & Compliance */}
      <Section icon={Receipt} title="Tax &amp; Compliance">
        <Field
          label="GSTIN"
          value={form.gstin}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
            setDirty(true)
          }}
          placeholder="33AAACH1234C1Z5"
          maxLength={15}
          hint="15-character GST Identification Number"
        />
        <Field
          label="Drug License No."
          value={form.drugLicenseNo}
          onChange={set('drugLicenseNo')}
          placeholder="TN-DL-20248"
          hint="Printed on every bill and Form 17/18"
        />
        <Field
          label="CIN"
          value={form.cinNo}
          onChange={set('cinNo')}
          placeholder="U85110TN2010PTC123456"
          hint="Company Identification Number (if registered)"
        />
        <Field
          label="PAN"
          value={form.panNo}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, panNo: e.target.value.toUpperCase() }))
            setDirty(true)
          }}
          placeholder="AAACH1234C"
          maxLength={10}
          hint="10-character Permanent Account Number"
        />
      </Section>

      {/* Bill preview note */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex gap-3 text-sm">
        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-blue-700">
          <span className="font-semibold">These details are printed on every bill.</span>{' '}
          Changes take effect on the next bill printed — existing bills are not affected.
          The Drug License No. and GSTIN are required for Form 17/18 compliance registers.
        </div>
      </div>

      {/* Sticky save bar (mobile) */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-end sm:hidden z-50">
          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}

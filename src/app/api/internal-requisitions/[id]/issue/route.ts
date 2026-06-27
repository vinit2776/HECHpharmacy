import { NextResponse } from 'next/server'
import { requireRole, apiError } from '@/lib/auth-utils'
import { issueRequisition } from '@/lib/db/internal-requisition'

const ISSUE_ROLES = ['purchase_pharmacist', 'manager', 'super_admin']

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(ISSUE_ROLES)
    const { id } = await params

    const updated = await issueRequisition(id, session.user.id)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Requisition not found') return NextResponse.json({ error: e.message }, { status: 404 })
    if (e.message === 'Requisition is not in draft status') return NextResponse.json({ error: e.message }, { status: 409 })
    if (e.message?.startsWith('Insufficient stock')) return NextResponse.json({ error: e.message }, { status: 422 })
    return apiError(e)
  }
}

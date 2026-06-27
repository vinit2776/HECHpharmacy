import { NextResponse } from 'next/server'
import { requireRole, apiError } from '@/lib/auth-utils'
import { cancelRequisition } from '@/lib/db/internal-requisition'

const CANCEL_ROLES = ['purchase_pharmacist', 'manager', 'super_admin']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(CANCEL_ROLES)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const reason = body.reason?.trim() || 'No reason provided'

    const updated = await cancelRequisition(id, session.user.id, reason)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Requisition not found') return NextResponse.json({ error: e.message }, { status: 404 })
    if (e.message === 'Only draft requisitions can be cancelled') return NextResponse.json({ error: e.message }, { status: 409 })
    return apiError(e)
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { updateTicketSchema } from '@/lib/validations/ticket'

// ── GET /api/tickets/[id] ────────────────────────────────────────────────────
//
// Admin sees any ticket; others only their own.
//
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(ALL_ROLES)
    const isAdmin = MANAGER_ROLES.includes(session.user.role as string)

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    })

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (!isAdmin && ticket.reporterId !== (session.user.id as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(ticket)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH /api/tickets/[id] ──────────────────────────────────────────────────
//
// Admin-only. Update status / severity / category, add notes or resolution.
// When status moves to 'resolved' or 'closed', stamp resolvedAt and resolvedBy.
//
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(MANAGER_ROLES)

    const body = await req.json()
    const parsed = updateTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 },
      )
    }

    const existing = await prisma.supportTicket.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const data = parsed.data
    const movingToResolved =
      data.status &&
      (data.status === 'resolved' || data.status === 'closed') &&
      existing.status !== 'resolved' &&
      existing.status !== 'closed'

    const updated = await prisma.supportTicket.update({
      where: { id: params.id },
      data: {
        ...(data.status     !== undefined && { status:     data.status     }),
        ...(data.severity   !== undefined && { severity:   data.severity   }),
        ...(data.category   !== undefined && { category:   data.category   }),
        ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
        ...(data.resolution !== undefined && { resolution: data.resolution }),
        ...(movingToResolved && {
          resolvedAt: new Date(),
          resolvedBy: session.user.name as string,
        }),
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

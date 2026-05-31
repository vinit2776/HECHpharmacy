import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'
import { createTicketSchema } from '@/lib/validations/ticket'

// ── GET /api/tickets ─────────────────────────────────────────────────────────
//
// Manager + super_admin see ALL tickets (with filters).
// Other roles see only their own tickets.
//
export async function GET(req: Request) {
  try {
    const session = await requireRole(ALL_ROLES)
    const isAdmin = MANAGER_ROLES.includes(session.user.role as string)

    const { searchParams } = new URL(req.url)
    const status   = searchParams.get('status')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const search   = searchParams.get('search') ?? ''

    const where: any = {}

    if (!isAdmin) {
      where.reporterId = session.user.id as string
    }

    if (status)   where.status   = status
    if (severity) where.severity = severity
    if (category) where.category = category

    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNo:    { contains: search, mode: 'insensitive' } },
      ]
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id:           true,
        ticketNo:     true,
        title:        true,
        category:     true,
        severity:     true,
        status:       true,
        reporterName: true,
        reporterRole: true,
        createdAt:    true,
        updatedAt:    true,
      },
    })

    return NextResponse.json(tickets)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── POST /api/tickets ────────────────────────────────────────────────────────
//
// Any logged-in user can create a ticket. Reporter info is taken from session
// and stored denormalized so the audit trail survives user deletion.
//
export async function POST(req: Request) {
  try {
    const session = await requireRole(ALL_ROLES)

    const body = await req.json()
    const parsed = createTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 },
      )
    }

    const data = parsed.data

    // Generate human-readable ticket number via Postgres sequence — atomic,
    // no race conditions even under concurrent submissions.
    const seqRow = await prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('support_ticket_seq') AS nextval
    `
    const ticketNo = `TKT-${String(seqRow[0].nextval).padStart(6, '0')}`

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNo,
        title:            data.title.trim(),
        description:      data.description.trim(),
        category:         data.category,
        severity:         data.severity,
        stepsToReproduce: data.stepsToReproduce?.trim() || null,
        expectedBehavior: data.expectedBehavior?.trim() || null,
        actualBehavior:   data.actualBehavior?.trim()   || null,
        pageUrl:          data.pageUrl     ?? null,
        userAgent:        data.userAgent   ?? null,
        screenSize:       data.screenSize  ?? null,
        buildCommit:      data.buildCommit ?? null,
        buildTime:        data.buildTime   ?? null,
        reporterId:       session.user.id    as string,
        reporterName:     session.user.name  as string,
        reporterEmail:    session.user.email as string,
        reporterRole:     session.user.role  as string,
      },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

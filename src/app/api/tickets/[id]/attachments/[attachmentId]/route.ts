import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES } from '@/lib/auth-utils'

// ── GET /api/tickets/[id]/attachments/[attachmentId] ─────────────────────────
//
// Streams the file bytes with the original Content-Type. Browser will preview
// images and PDFs inline; everything else downloads.
//
// Auth: reporter for own ticket, admin for any.
//
export async function GET(
  _req: Request,
  { params }: { params: { id: string; attachmentId: string } },
) {
  try {
    const session = await requireRole(ALL_ROLES)
    const isAdmin = MANAGER_ROLES.includes(session.user.role as string)

    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: params.attachmentId },
      include: {
        ticket: { select: { id: true, reporterId: true } },
      },
    })

    if (!attachment || attachment.ticketId !== params.id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (!isAdmin && attachment.ticket.reporterId !== (session.user.id as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prisma returns Bytes as Buffer in Node.js runtime.
    const bytes = Buffer.isBuffer(attachment.data)
      ? attachment.data
      : Buffer.from(attachment.data as unknown as ArrayBuffer)
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type':           attachment.contentType,
        'Content-Length':         String(attachment.sizeBytes),
        // inline → images/PDFs render in browser; filename used for downloads
        'Content-Disposition':    `inline; filename="${encodeURIComponent(attachment.filename)}"`,
        // nosniff defends against MIME-type confusion attacks
        'X-Content-Type-Options': 'nosniff',
        // Short-lived cache so repeated views during a ticket review are fast
        'Cache-Control':          'private, max-age=300',
      },
    })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── DELETE /api/tickets/[id]/attachments/[attachmentId] ──────────────────────
// Reporter can delete own attachment while ticket is still open; admin always.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; attachmentId: string } },
) {
  try {
    const session = await requireRole(ALL_ROLES)
    const isAdmin = MANAGER_ROLES.includes(session.user.role as string)

    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: params.attachmentId },
      include: {
        ticket: { select: { id: true, reporterId: true, status: true } },
      },
    })

    if (!attachment || attachment.ticketId !== params.id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (!isAdmin) {
      if (attachment.ticket.reporterId !== (session.user.id as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (attachment.ticket.status === 'resolved' || attachment.ticket.status === 'closed') {
        return NextResponse.json(
          { error: 'Cannot delete attachments on a resolved or closed ticket.' },
          { status: 409 },
        )
      }
    }

    await prisma.ticketAttachment.delete({ where: { id: params.attachmentId } })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

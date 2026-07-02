import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, ALL_ROLES, MANAGER_ROLES, apiError} from '@/lib/auth-utils'

// Force Node.js runtime — formData() with Buffer conversion needs Node APIs,
// not Edge. Allow up to 60s for large uploads on slow connections.
export const runtime    = 'nodejs'
export const maxDuration = 60

// Configuration — kept in one place for easy tuning.
const MAX_FILE_BYTES   = 5 * 1024 * 1024     // 5 MB per file
const MAX_FILES_TOTAL  = 3                   // per ticket
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
])

// Bytes → human readable
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// ── GET /api/tickets/[id]/attachments ────────────────────────────────────────
// Returns metadata only (no bytes). Reporter sees their own; admin sees any.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(ALL_ROLES)
    const isAdmin = MANAGER_ROLES.includes(session.user.role as string)

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { id: true, reporterId: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (!isAdmin && ticket.reporterId !== (session.user.id as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attachments = await prisma.ticketAttachment.findMany({
      where: { ticketId: params.id },
      orderBy: { uploadedAt: 'asc' },
      select: {
        id:          true,
        filename:    true,
        contentType: true,
        sizeBytes:   true,
        uploadedBy:  true,
        uploadedAt:  true,
      },
    })

    return NextResponse.json(attachments)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return apiError(e)
  }
}

// ── POST /api/tickets/[id]/attachments ───────────────────────────────────────
// multipart/form-data with one or more files under field name "files".
// Reporter can attach to their own ticket; admin to any.
//
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(ALL_ROLES)
    const isAdmin = MANAGER_ROLES.includes(session.user.role as string)

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { id: true, reporterId: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (!isAdmin && ticket.reporterId !== (session.user.id as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cap total attachments per ticket
    const existingCount = await prisma.ticketAttachment.count({ where: { ticketId: params.id } })
    if (existingCount >= MAX_FILES_TOTAL) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_TOTAL} attachments per ticket already reached.` },
        { status: 409 },
      )
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const files = formData.getAll('files').filter((f): f is File => f instanceof File)
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    if (existingCount + files.length > MAX_FILES_TOTAL) {
      return NextResponse.json(
        {
          error:
            `This upload would exceed the ${MAX_FILES_TOTAL}-file limit per ticket ` +
            `(${existingCount} already attached, ${files.length} new).`,
        },
        { status: 409 },
      )
    }

    // Validate each file BEFORE writing any — fail fast, don't leave partials.
    const errors: string[] = []
    const buffers: { file: File; bytes: Buffer }[] = []
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: unsupported type "${file.type}". Allowed: PNG, JPEG, GIF, WebP, PDF.`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push(`${file.name}: ${fmtBytes(file.size)} exceeds the ${fmtBytes(MAX_FILE_BYTES)} limit.`)
        continue
      }
      const ab = await file.arrayBuffer()
      buffers.push({ file, bytes: Buffer.from(ab) })
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' • ') }, { status: 422 })
    }

    // Write all attachments in a single transaction so partial failures roll back.
    const created = await prisma.$transaction(
      buffers.map(({ file, bytes }) =>
        prisma.ticketAttachment.create({
          data: {
            ticketId:    params.id,
            filename:    file.name.slice(0, 255),
            contentType: file.type,
            sizeBytes:   file.size,
            data:        bytes as Uint8Array<ArrayBuffer>,
            uploadedBy:  session.user.id as string,
          },
          select: {
            id:          true,
            filename:    true,
            contentType: true,
            sizeBytes:   true,
            uploadedBy:  true,
            uploadedAt:  true,
          },
        }),
      ),
    )

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden')       return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: e.message ?? 'Upload failed' }, { status: 500 })
  }
}

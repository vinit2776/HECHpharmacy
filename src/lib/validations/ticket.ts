import { z } from 'zod'

export const TICKET_CATEGORIES = [
  'bug',
  'feature_request',
  'question',
  'ui_issue',
  'data_issue',
  'performance',
  'other',
] as const

export const TICKET_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'awaiting_user',
  'resolved',
  'closed',
] as const

export const ticketCategoryLabels: Record<(typeof TICKET_CATEGORIES)[number], string> = {
  bug:             'Bug',
  feature_request: 'Feature Request',
  question:        'Question',
  ui_issue:        'UI Issue',
  data_issue:      'Data Issue',
  performance:     'Performance',
  other:           'Other',
}

export const ticketSeverityLabels: Record<(typeof TICKET_SEVERITIES)[number], string> = {
  low:      'Low',
  medium:   'Medium',
  high:     'High',
  critical: 'Critical',
}

export const ticketStatusLabels: Record<(typeof TICKET_STATUSES)[number], string> = {
  open:           'Open',
  in_progress:    'In Progress',
  awaiting_user:  'Awaiting User',
  resolved:       'Resolved',
  closed:         'Closed',
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  title:            z.string().min(3, 'Title must be at least 3 characters').max(200),
  description:      z.string().min(10, 'Please describe the issue in at least 10 characters'),
  category:         z.enum(TICKET_CATEGORIES).default('bug'),
  severity:         z.enum(TICKET_SEVERITIES).default('medium'),
  stepsToReproduce: z.string().max(5000).optional(),
  expectedBehavior: z.string().max(2000).optional(),
  actualBehavior:   z.string().max(2000).optional(),

  // Auto-captured from browser
  pageUrl:     z.string().max(2000).optional(),
  userAgent:   z.string().max(2000).optional(),
  screenSize:  z.string().max(40).optional(),
  buildCommit: z.string().max(80).optional(),
  buildTime:   z.string().max(80).optional(),
})

export const updateTicketSchema = z.object({
  status:     z.enum(TICKET_STATUSES).optional(),
  severity:   z.enum(TICKET_SEVERITIES).optional(),
  category:   z.enum(TICKET_CATEGORIES).optional(),
  adminNotes: z.string().max(10000).optional(),
  resolution: z.string().max(10000).optional(),
})

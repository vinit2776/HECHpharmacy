import { auth } from './auth'
import { NextResponse } from 'next/server'

export async function requireRole(roles: string[]) {
  const session = await auth()
  if (!session) {
    throw new Error('Unauthenticated')
  }
  if (!roles.includes(session.user.role as string)) {
    throw new Error('Forbidden')
  }
  return session
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function withRole(roles: string[], handler: (session: any) => Promise<Response>) {
  try {
    const session = await requireRole(roles)
    return handler(session)
  } catch (e: any) {
    if (e.message === 'Unauthenticated') return unauthorizedResponse()
    if (e.message === 'Forbidden') return forbiddenResponse()
    throw e
  }
}

// Converts any caught error to a safe API response.
// Prisma errors (code starts with 'P') expose schema details; replace them with a generic message.
export function apiError(e: any): Response {
  if (e.message === 'Unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (e.code?.startsWith('P')) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json({ error: e.message ?? 'Internal server error' }, { status: 500 })
}

export const ALL_ROLES = ['counter_pharmacist', 'purchase_pharmacist', 'manager', 'super_admin']
export const MANAGER_ROLES = ['manager', 'super_admin']
export const SUPER_ADMIN_ROLES = ['super_admin']
export const COUNTER_ROLES = ['counter_pharmacist', 'manager', 'super_admin']
export const PURCHASE_ROLES = ['purchase_pharmacist', 'manager', 'super_admin']

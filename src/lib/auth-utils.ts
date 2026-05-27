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

export const ALL_ROLES = ['counter_pharmacist', 'purchase_pharmacist', 'manager', 'super_admin']
export const MANAGER_ROLES = ['manager', 'super_admin']
export const SUPER_ADMIN_ROLES = ['super_admin']
export const COUNTER_ROLES = ['counter_pharmacist', 'manager', 'super_admin']
export const PURCHASE_ROLES = ['purchase_pharmacist', 'manager', 'super_admin']

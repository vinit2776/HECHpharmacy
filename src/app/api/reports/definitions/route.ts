import { NextResponse } from 'next/server'
import { requireRole, ALL_ROLES, apiError } from '@/lib/auth-utils'
import { REPORT_REGISTRY } from '@/lib/reports/registry'

export async function GET() {
  try {
    await requireRole(ALL_ROLES)
    return NextResponse.json(REPORT_REGISTRY)
  } catch (e: any) {
    return apiError(e)
  }
}

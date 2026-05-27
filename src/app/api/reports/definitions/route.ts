import { NextResponse } from 'next/server'
import { REPORT_REGISTRY } from '@/lib/reports/registry'

export async function GET() {
  return NextResponse.json(REPORT_REGISTRY)
}

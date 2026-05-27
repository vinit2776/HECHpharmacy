import { prisma } from '../prisma'

interface AuditParams {
  userId: string
  action: string
  tableName: string
  recordId: string
  beforeData?: any
  afterData?: any
  ipAddress?: string
  tx?: any
}

export async function createAuditLog(params: AuditParams) {
  const db = params.tx ?? prisma
  return db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId,
      beforeData: params.beforeData ?? undefined,
      afterData: params.afterData ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
    },
  })
}

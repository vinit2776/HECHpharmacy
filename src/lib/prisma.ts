import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const g = globalThis as any

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })
  return new PrismaClient({ adapter, log: ['error'] })
}

export const prisma: PrismaClient = g.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') g.prisma = prisma

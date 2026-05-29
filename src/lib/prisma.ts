import { PrismaClient } from '@prisma/client'
import { PrismaPg }    from '@prisma/adapter-pg'

const g = globalThis as any

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!

  // Always use the standard pg TCP adapter — works for:
  //   • local PostgreSQL (direct TCP)
  //   • Neon connection pooler endpoint (adds "-pooler" to hostname)
  //     which is the recommended way to connect from serverless runtimes
  //     (avoids WebSocket bundling issues in Next.js / Vercel)
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter, log: ['error'] })
}

export const prisma: PrismaClient = g.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') g.prisma = prisma

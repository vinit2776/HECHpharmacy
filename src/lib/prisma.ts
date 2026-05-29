import { PrismaClient } from '@prisma/client'
import { PrismaPg }    from '@prisma/adapter-pg'
import { neonConfig }   from '@neondatabase/serverless'
import { PrismaNeon }   from '@prisma/adapter-neon'

const g = globalThis as any

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!

  // Neon serverless URLs contain "neon.tech".
  // Use HTTP fetch transport (poolQueryViaFetch) instead of WebSockets so that
  // Next.js serverless functions on Vercel work without the `ws` native addon,
  // which breaks when bundled. HTTP fetch is available in all environments
  // (Node.js, Edge, Vercel Lambda) with no polyfill needed.
  if (url?.includes('neon.tech')) {
    neonConfig.poolQueryViaFetch = true
    const adapter = new PrismaNeon({ connectionString: url })
    return new PrismaClient({ adapter, log: ['error'] })
  }

  // Local / on-premise PostgreSQL — standard TCP via pg.
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter, log: ['error'] })
}

export const prisma: PrismaClient = g.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') g.prisma = prisma

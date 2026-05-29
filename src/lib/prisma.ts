import { PrismaClient } from '@prisma/client'
import { PrismaPg }    from '@prisma/adapter-pg'
import { neonConfig }   from '@neondatabase/serverless'
import { PrismaNeon }   from '@prisma/adapter-neon'
import ws from 'ws'

const g = globalThis as any

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!

  // Neon serverless URLs contain "neon.tech" — use the Neon WebSocket adapter
  // so Vercel functions never exhaust TCP connection limits.
  // Local / on-premise PostgreSQL uses the standard pg TCP adapter.
  if (url?.includes('neon.tech')) {
    // WebSocket polyfill required in Node.js runtime (not needed in edge)
    neonConfig.webSocketConstructor = ws
    const adapter = new PrismaNeon({ connectionString: url })
    return new PrismaClient({ adapter, log: ['error'] })
  }

  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter, log: ['error'] })
}

export const prisma: PrismaClient = g.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') g.prisma = prisma

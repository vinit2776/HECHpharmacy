import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Middleware runs in Vercel's Edge Runtime — must NOT import Prisma or pg.
// Use the edge-compatible authConfig (no Credentials provider, no DB).
// The `authorized` callback in authConfig handles the redirect logic.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

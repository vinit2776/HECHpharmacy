import type { NextAuthConfig } from 'next-auth'

// Edge-compatible NextAuth config — NO Prisma/pg imports.
// Used by middleware (Edge Runtime). The full config (auth.ts) adds
// the Credentials provider with DB access for Node.js runtimes.
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname.startsWith('/login')
      if (!isLoggedIn && !isLoginPage) return false   // redirect to signIn page
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = (token.id ?? token.sub) as string
      return session
    },
  },
  providers: [], // filled in by auth.ts for Node.js runtime
} satisfies NextAuthConfig

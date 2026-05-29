import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// NextAuth v5 middleware: use auth() instead of getToken().
// v5 uses JWE-encrypted tokens; the old next-auth/jwt getToken()
// cannot decode them and always returned null → redirect loop.
export const middleware = auth((req) => {
  const { auth: session, nextUrl } = req as any
  if (!session && !nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

import { NextResponse } from 'next/server'

// Supabase derives this key from the project URL: sb-<ref>-auth-token
const AUTH_COOKIE = 'sb-dizhjuhogcfjljofduej-auth-token'
const LOGIN_PATH = '/login'

export function proxy(request) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(AUTH_COOKIE)

  if (pathname === LOGIN_PATH) {
    // Already authenticated → send to dashboard
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Any other route requires a session
  if (!hasSession) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)'],
}

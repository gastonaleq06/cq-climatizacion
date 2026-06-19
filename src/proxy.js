import { NextResponse } from 'next/server'

const AUTH_COOKIE = 'sb-dizhjuhogcfjljofduej-auth-token'
const LOGIN_PATH = '/login'

export async function proxy(request) {
  const { pathname } = request.nextUrl
  const hasSession = !!request.cookies.get(AUTH_COOKIE)?.value

  if (pathname === LOGIN_PATH) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)'],
}

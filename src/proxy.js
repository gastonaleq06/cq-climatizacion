import { NextResponse } from 'next/server'

const AUTH_COOKIE = 'sb-dizhjuhogcfjljofduej-auth-token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const LOGIN_PATH = '/login'
const RBAC_PATHS = ['/nomina', '/tecnicos']

export async function proxy(request) {
  const { pathname } = request.nextUrl
  const cookie = request.cookies.get(AUTH_COOKIE)
  const hasSession = !!cookie?.value

  if (pathname === LOGIN_PATH) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  const isRbacPath = RBAC_PATHS.some((p) => pathname.startsWith(p))
  if (isRbacPath && SUPABASE_URL && SUPABASE_ANON_KEY) {
    let accessToken
    try {
      const session = JSON.parse(decodeURIComponent(cookie.value))
      accessToken = session?.access_token
    } catch {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    }

    if (!accessToken) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=rol`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
      }

      const [profile] = await res.json()
      if (!['admin', 'jefe'].includes(profile?.rol)) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)'],
}

import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next()

  const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!ref) return NextResponse.next()

  const cookieName = `sb-${ref}-auth-token`
  const cookie = request.cookies.get(cookieName)

  if (!cookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let accessToken
  try {
    const session = JSON.parse(decodeURIComponent(cookie.value))
    accessToken = session?.access_token
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
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
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const [profile] = await res.json()
    if (!['admin', 'jefe'].includes(profile?.rol)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/nomina/:path*', '/tecnicos/:path*'],
}

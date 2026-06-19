import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const secureFlag = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''

// Cookie-based storage so the session is readable by the proxy for auth protection.
// The proxy checks for the 'sb-<ref>-auth-token' cookie on every server request.
const cookieStorage = {
  getItem(key) {
    if (typeof document === 'undefined') return null
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  },
  setItem(key, value) {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax; Max-Age=604800${secureFlag}`
  },
  removeItem(key) {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; Max-Age=0${secureFlag}`
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

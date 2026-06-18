import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dizhjuhogcfjljofduej.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpemhqdWhvZ2Nmamxqb2ZkdWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjE3NDMsImV4cCI6MjA5NzEzNzc0M30.DdmvvjB8o2dZA66oXLXMEzlZajWgxiLidncz4A6xcgo'

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
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax; Max-Age=604800`
  },
  removeItem(key) {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; Max-Age=0`
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

import type { Database } from '../types/Database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isPublicKey(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true
  try {
    const payload = key.split('.')[1]
    if (!payload) return false
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'
  } catch {
    return false
  }
}

function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey || !isPublicKey(supabaseAnonKey)) return null
  try {
    const url = new URL(supabaseUrl)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // This application currently supports password login only.
        detectSessionInUrl: false,
      },
    })
  } catch {
    return null
  }
}

export const supabase = createSupabaseClient()

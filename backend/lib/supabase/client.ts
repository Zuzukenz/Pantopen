import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server tidak boleh menyimpan sesi: satu proses melayani banyak pengguna.
const serverAuth = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

// Client anon BERSAMA — hanya untuk query publik (dibatasi RLS). JANGAN dipakai untuk signIn,
// karena sesi login akan menempel di client yang dipakai semua request berikutnya.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, serverAuth)

// Client anon BARU per request. Bila accessToken diberikan, query berjalan sebagai user itu (auth.uid() terisi).
export function createAnonClient(accessToken?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    ...serverAuth,
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  })
}

import { createAnonClient } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { json, fail, rateLimited, clientIp } from '@/lib/auth'

// POST: login admin. Token hanya diberikan bila profiles.role = 'admin'.
export async function POST(request: Request) {
  if (rateLimited('admin-login:' + clientIp(request), 8, 60_000)) return fail('Terlalu banyak percobaan. Coba lagi sebentar lagi.', 429)

  const { email, password } = await request.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return fail('Email dan password wajib diisi', 400)

  // Client BARU per login: sesi tidak boleh menempel di client bersama yang dipakai request lain
  const { data, error } = await createAnonClient().auth.signInWithPassword({ email, password })
  if (error || !data.session) return fail('Kredensial salah', 401)

  const { data: p } = await supabaseAdmin.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  // pesan sama untuk "salah password" dan "bukan admin" agar akun tidak bisa ditebak
  if (p?.role !== 'admin') return fail('Kredensial salah', 401)

  return json({ success: true, token: data.session.access_token, expiresAt: data.session.expires_at })
}

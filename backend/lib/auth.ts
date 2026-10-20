import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status })
export const fail = (error: string, status = 400) => json({ error }, status)

// Ambil token dari header "Authorization: Bearer <access_token>"
export function bearer(request: Request): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec((request.headers.get('Authorization') || '').trim())
  return m ? m[1] : null
}

// Verifikasi JWT Supabase Auth ke server Auth (bukan sekadar decode) → user atau null
export async function getUser(request: Request): Promise<User | null> {
  const token = bearer(request)
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return error || !data.user ? null : data.user
}

export type Guard =
  | { ok: true; user: User; token: string }
  | { ok: false; response: NextResponse }

// Wajib login → 401 bila token tidak ada / tidak valid / kedaluwarsa
export async function requireUser(request: Request): Promise<Guard> {
  const token = bearer(request)
  if (!token) return { ok: false, response: fail('Unauthorized: token tidak ditemukan', 401) }
  const user = await getUser(request)
  if (!user) return { ok: false, response: fail('Unauthorized: token tidak valid atau kedaluwarsa', 401) }
  return { ok: true, user, token }
}

// Wajib admin → 401 bila belum login, 403 bila profiles.role bukan 'admin'.
// Role SELALU dibaca dari tabel profiles (service-role), tidak pernah dari klaim di token/body/localStorage.
export async function requireAdmin(request: Request): Promise<Guard> {
  const g = await requireUser(request)
  if (!g.ok) return g
  const { data, error } = await supabaseAdmin.from('profiles').select('role').eq('id', g.user.id).maybeSingle()
  if (error || data?.role !== 'admin') return { ok: false, response: fail('Forbidden: khusus admin', 403) }
  return g
}

// Pembatas laju sederhana (in-memory, best-effort di serverless) untuk endpoint rawan brute-force
const hits = new Map<string, { n: number; reset: number }>()
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return false }
  h.n++
  return h.n > max
}
export const clientIp = (r: Request) => (r.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'

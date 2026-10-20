import { supabaseAdmin } from '@/lib/supabase/admin'
import { json, fail } from '@/lib/auth'

// GET: notifikasi terbaru (?since=ISO-date untuk polling). Untuk realtime, subscribe ke tabel notifications via Supabase Realtime.
export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get('since')
  if (since && Number.isNaN(Date.parse(since))) return fail('Parameter since tidak valid', 400)
  let q = supabaseAdmin.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
  if (since) q = q.gt('created_at', since)
  const { data, error } = await q
  if (error) { console.error('notifications:', error.message); return fail('Gagal memuat notifikasi', 400) }
  return json({ success: true, data })
}

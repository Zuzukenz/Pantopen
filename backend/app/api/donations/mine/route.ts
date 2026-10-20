import { supabaseAdmin } from '@/lib/supabase/admin'
import { getUser, bearer, json, fail } from '@/lib/auth'

// GET: riwayat donasi milik sendiri. User login → by token; tamu (tanpa login) → ?guestId=<id acak dari browser>
export async function GET(request: Request) {
  let q = supabaseAdmin.from('donations')
    .select('id, campaign_id, amount, status, payment_reference, donor_name, created_at, campaigns ( title ), payment_transactions ( provider )')
    .order('created_at', { ascending: false })
    .limit(200)

  if (bearer(request)) {
    const user = await getUser(request)
    if (!user) return fail('Unauthorized: token tidak valid atau kedaluwarsa', 401)
    q = q.eq('donor_id', user.id)
  } else {
    const guestId = new URL(request.url).searchParams.get('guestId') || ''
    if (!/^[A-Za-z0-9_-]{12,64}$/.test(guestId)) return fail('Login atau sertakan guestId yang valid', 400)
    q = q.eq('guest_id', guestId).is('donor_id', null)
  }
  const { data, error } = await q
  if (error) { console.error('donations/mine:', error.message); return fail('Gagal memuat riwayat donasi', 400) }
  return json({ success: true, data })
}

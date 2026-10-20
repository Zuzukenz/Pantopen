import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin, json, fail } from '@/lib/auth'

// GET (admin): semua donasi termasuk 'pending', untuk tabel konfirmasi di dashboard admin
export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const { data, error } = await supabaseAdmin.from('donations')
    .select('id, campaign_id, amount, status, donor_name, is_anonymous, payment_reference, created_at, campaigns ( title ), profiles ( full_name ), payment_transactions ( provider )')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) { console.error('admin/donations:', error.message); return fail('Gagal memuat donasi', 400) }
  return json({ success: true, data })
}

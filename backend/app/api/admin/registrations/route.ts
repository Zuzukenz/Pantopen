import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin, json, fail } from '@/lib/auth'

// GET (admin): daftar pendaftar relawan
export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const { data, error } = await supabaseAdmin.from('volunteer_registrations')
    .select('id, event_id, created_at, profiles ( full_name, email ), volunteer_events ( title )')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) { console.error('admin/registrations:', error.message); return fail('Gagal memuat pendaftar', 400) }
  return json({ success: true, data })
}

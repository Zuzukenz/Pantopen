import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin, requireUser, json, fail } from '@/lib/auth'
import { createDisasterSchema } from '@/lib/validation/schemas'
import { parseLocation } from '@/lib/geo'

const STATUSES = ['pending', 'verified', 'rejected', 'resolved']
const TYPES = ['flood', 'earthquake', 'landslide', 'wildfire', 'other']

// GET: daftar laporan bencana. Publik hanya 'verified'; status lain khusus admin.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams
  const status = sp.get('status') || 'verified'
  const type = sp.get('type')
  if (!STATUSES.includes(status) || (type && !TYPES.includes(type))) return fail('Parameter tidak valid', 400)

  let db = supabase
  if (status !== 'verified') {
    const admin = await requireAdmin(request)
    if (!admin.ok) return admin.response
    db = supabaseAdmin
  }
  let q = db.from('disaster_reports')
    .select('id, title, description, disaster_type, severity, status, location_name, location, created_at')
    .eq('status', status)
  if (type) q = q.eq('disaster_type', type)

  const { data, error } = await q
  if (error) { console.error('disasters GET:', error.message); return fail('Gagal memuat laporan bencana', 400) }
  const out = (data ?? []).map(({ location, ...r }: any) => ({ ...r, lat: parseLocation(location)?.lat ?? null, lng: parseLocation(location)?.lng ?? null }))
  return json({ success: true, count: out.length, data: out })
}

// POST: kirim laporan bencana baru (wajib login; status awal 'pending' sampai diverifikasi admin)
export async function POST(request: Request) {
  const g = await requireUser(request)
  if (!g.ok) return g.response
  const parsed = createDisasterSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Data laporan tidak valid', 400)
  const b = parsed.data

  const { data, error } = await supabaseAdmin.from('disaster_reports').insert({
    title: b.title, description: b.description, disaster_type: b.disasterType, severity: b.severity ?? 'medium',
    status: 'pending',                              // selalu pending: status tidak boleh ditentukan pelapor
    location_name: b.locationName, location: `SRID=4326;POINT(${b.longitude} ${b.latitude})`,
    reported_by: g.user.id,
  }).select('id, title, status, created_at').single()
  if (error) { console.error('disasters POST:', error.message); return fail('Gagal mengirim laporan', 400) }
  return json({ success: true, message: 'Laporan bencana berhasil dikirim dan menunggu verifikasi admin', data }, 201)
}

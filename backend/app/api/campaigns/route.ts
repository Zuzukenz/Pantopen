import { randomUUID } from 'crypto'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin, json, fail } from '@/lib/auth'
import { createCampaignSchema } from '@/lib/validation/schemas'
import { parseLocation } from '@/lib/geo'

const STATUSES = ['draft', 'pending', 'active', 'completed', 'rejected', 'cancelled']

// GET: daftar kampanye. Publik hanya boleh melihat 'active'; status lain / 'all' khusus admin.
export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get('status') || 'active'
  if (status !== 'all' && !STATUSES.includes(status)) return fail('Status tidak valid', 400)

  let db = supabase
  if (status !== 'active') {
    const admin = await requireAdmin(request)
    if (!admin.ok) return admin.response
    db = supabaseAdmin
  }
  let q = db.from('campaigns')
    .select('id, title, slug, description, category, target_amount, collected_amount, status, start_at, end_at, disaster_report_id, disaster_reports ( location_name, severity, location )')
    .order('created_at', { ascending: false })
  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) { console.error('campaigns GET:', error.message); return fail('Gagal memuat kampanye', 400) }

  const out = (data ?? []).map((c: any) => {
    const { disaster_reports: r, ...rest } = c
    const pos = r ? parseLocation(r.location) : null
    return { ...rest, disaster: r ? { locationName: r.location_name, severity: r.severity, lat: pos?.lat ?? null, lng: pos?.lng ?? null } : null }
  })
  return json({ success: true, count: out.length, data: out })
}

// POST: membuat kampanye baru — KHUSUS ADMIN (token Supabase + profiles.role = 'admin')
export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const parsed = createCampaignSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Data kampanye tidak valid', 400)
  const b = parsed.data

  const start = b.startAt ? new Date(b.startAt) : new Date()
  const end = b.endAt ? new Date(b.endAt) : new Date(start.getTime() + (b.days ?? 30) * 864e5)
  if (end <= start) return fail('Tanggal berakhir harus setelah tanggal mulai', 400)

  let reportId = b.disasterReportId ?? null
  if (!reportId && b.locationName && b.latitude !== undefined && b.longitude !== undefined) {
    const { data: rep, error: repErr } = await supabaseAdmin.from('disaster_reports').insert({
      title: b.title, description: b.description, disaster_type: 'other', severity: b.severity ?? 'medium',
      status: 'verified', location_name: b.locationName, location: `SRID=4326;POINT(${b.longitude} ${b.latitude})`,
      reported_by: admin.user.id, verified_by: admin.user.id, verified_at: new Date().toISOString(),
    }).select('id').single()
    if (repErr) { console.error('campaign location report:', repErr.message); return fail('Gagal menyimpan lokasi kampanye', 400) }
    reportId = rep.id
  }

  const slug = b.slug ?? `${b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'kampanye'}-${randomUUID().slice(0, 6)}`
  const { data, error } = await supabaseAdmin.from('campaigns').insert({
    disaster_report_id: reportId, title: b.title, slug, description: b.description, category: b.category,
    target_amount: b.targetAmount,
    // collected_amount sengaja tidak diisi: default 0 di DB, dihitung Trigger SQL saat donasi 'paid'
    status: b.status ?? 'pending',                 // default: menunggu verifikasi
    start_at: start.toISOString(), end_at: end.toISOString(), created_by: admin.user.id,
  }).select().single()
  if (error) {
    console.error('campaigns POST:', error.message)
    return error.code === '23505' ? fail('Slug kampanye sudah dipakai', 409) : fail('Gagal membuat kampanye', 400)
  }
  return json({ success: true, message: 'Kampanye berhasil dibuat', data }, 201)
}

// DELETE: hapus kampanye (?id=) — khusus admin
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get('id'))
  if (!id.success) return fail('id wajib berupa UUID', 400)
  const { error } = await supabaseAdmin.from('campaigns').delete().eq('id', id.data)
  if (error) { console.error('campaigns DELETE:', error.message); return fail('Gagal menghapus kampanye', 400) }
  return json({ success: true })
}

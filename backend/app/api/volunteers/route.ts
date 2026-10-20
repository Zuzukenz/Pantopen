import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createAnonClient } from '@/lib/supabase/client'
import { requireUser, requireAdmin, json, fail } from '@/lib/auth'

const schema = z.object({
  title: z.string().trim().min(3).max(150), category: z.string().trim().min(2).max(60),
  locationName: z.string().trim().min(2).max(150), schedule: z.string().trim().min(2).max(100),
  slots: z.number().int().positive().max(100000), description: z.string().trim().min(3).max(5000),
  imageUrl: z.string().url().max(500).optional(),
})

export async function GET() {
  const { data, error } = await supabaseAdmin.from('volunteer_events').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) { console.error('volunteers GET:', error.message); return fail('Gagal memuat kegiatan relawan', 400) }
  return json({ success: true, data })
}

// POST admin: tambah kegiatan relawan
export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const p = schema.safeParse(await request.json().catch(() => null))
  if (!p.success) return fail('Data tidak valid', 400)
  const d = p.data
  const { data, error } = await supabaseAdmin.from('volunteer_events').insert({
    title: d.title, category: d.category, location_name: d.locationName, schedule: d.schedule,
    slots: d.slots, description: d.description, image_url: d.imageUrl, created_by: admin.user.id,
  }).select().single()
  if (error) { console.error('volunteers POST:', error.message); return fail('Gagal menambah kegiatan', 400) }
  return json({ success: true, data }, 201)
}

// PUT user login: daftar relawan ke sebuah kegiatan ({ eventId })
export async function PUT(request: Request) {
  const g = await requireUser(request)
  if (!g.ok) return g.response
  const body = z.object({ eventId: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!body.success) return fail('eventId wajib berupa UUID', 400)
  // Client dengan JWT user agar auth.uid() terisi di fungsi register_volunteer
  const { error } = await createAnonClient(g.token).rpc('register_volunteer', { p_event: body.data.eventId })
  if (error) {
    if (error.code === '23505') return fail('Anda sudah terdaftar di kegiatan ini', 409)
    return fail(error.message.includes('Kuota') ? error.message : 'Gagal mendaftar relawan', 400)
  }
  return json({ success: true })
}

// DELETE admin: hapus kegiatan (?id=)
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get('id'))
  if (!id.success) return fail('id wajib berupa UUID', 400)
  const { error } = await supabaseAdmin.from('volunteer_events').delete().eq('id', id.data)
  if (error) { console.error('volunteers DELETE:', error.message); return fail('Gagal menghapus kegiatan', 400) }
  return json({ success: true })
}

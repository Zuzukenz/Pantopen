import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin, json, fail } from '@/lib/auth'

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(10000),
  cat: z.string().trim().max(40).optional(),
})

export async function GET() {
  const { data, error } = await supabaseAdmin.from('news').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) { console.error('news GET:', error.message); return fail('Gagal memuat berita', 400) }
  return json({ success: true, data })
}

// POST: khusus admin. Trigger DB otomatis membuat notifikasi untuk semua user.
export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Data berita tidak valid', 400)
  const { data, error } = await supabaseAdmin.from('news')
    .insert({ title: parsed.data.title, body: parsed.data.body, category: parsed.data.cat || 'Pengumuman', created_by: admin.user.id })
    .select().single()
  if (error) { console.error('news POST:', error.message); return fail('Gagal menerbitkan berita', 400) }
  return json({ success: true, data }, 201)
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get('id'))
  if (!id.success) return fail('id wajib berupa UUID', 400)
  const { error } = await supabaseAdmin.from('news').delete().eq('id', id.data)
  if (error) { console.error('news DELETE:', error.message); return fail('Gagal menghapus berita', 400) }
  return json({ success: true })
}

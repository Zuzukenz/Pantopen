import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser, json, fail } from '@/lib/auth'
import { updateProfileSchema } from '@/lib/validation/auth'

// GET: profil pengguna yang sedang login (id diambil dari token terverifikasi, bukan dari request)
export async function GET(request: Request) {
  const g = await requireUser(request)
  if (!g.ok) return g.response
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', g.user.id).maybeSingle()
  if (error || !data) return fail('Profil tidak ditemukan', 404)
  return json({ success: true, data })
}

// PATCH: perbarui profil. Hanya fullName/phone/avatarUrl — field lain (mis. role) diabaikan oleh skema.
export async function PATCH(request: Request) {
  const g = await requireUser(request)
  if (!g.ok) return g.response
  const v = updateProfileSchema.safeParse(await request.json().catch(() => null))
  if (!v.success) return json({ error: v.error.format() }, 400)

  const { fullName, phone, avatarUrl } = v.data
  const patch: Record<string, string> = { updated_at: new Date().toISOString() }
  if (fullName !== undefined) patch.full_name = fullName
  if (phone !== undefined) patch.phone = phone
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl
  if (Object.keys(patch).length === 1) return fail('Tidak ada data yang diubah', 400)

  const { data, error } = await supabaseAdmin.from('profiles').update(patch).eq('id', g.user.id).select().single()
  if (error) { console.error('me PATCH:', error.message); return fail('Gagal memperbarui profil', 400) }
  return json({ success: true, message: 'Profil berhasil diperbarui', data })
}

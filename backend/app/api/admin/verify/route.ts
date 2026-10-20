import { requireAdmin, json } from '@/lib/auth'

// GET: validasi sesi admin. Dipanggil frontend sebelum menampilkan admin.html (200 = token valid & role admin).
export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  return json({ success: true, role: 'admin', email: admin.user.email })
}

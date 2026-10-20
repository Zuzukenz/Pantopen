import { requireAdmin, json, fail } from '@/lib/auth'
import { markDonationPaid } from '@/lib/donations'
import { confirmDonationSchema } from '@/lib/validation/schemas'

// POST (khusus admin): konfirmasi donasi manual 'pending' → 'paid' (QR DANA / transfer nomor tidak punya webhook).
// Body: { donationId: uuid }
// - Idempotent: konfirmasi ulang donasi yang sudah 'paid' tetap 200 (idempotent: true), tidak memproses dua kali.
// - collected_amount di campaigns TIDAK dihitung di sini: Trigger SQL di database yang mengurusnya saat status → 'paid'.
export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const parsed = confirmDonationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('donationId wajib berupa UUID yang valid', 400)

  const r = await markDonationPaid({ id: parsed.data.donationId })
  if (!r.ok) return fail(r.error, r.status)
  return json({
    success: true,
    idempotent: r.idempotent,
    message: r.idempotent ? 'Donasi sudah berstatus paid' : 'Donasi berhasil dikonfirmasi',
    data: { id: r.id, status: 'paid' },
  })
}

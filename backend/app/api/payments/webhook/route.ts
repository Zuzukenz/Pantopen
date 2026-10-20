import { timingSafeEqual } from 'crypto'
import { json, fail } from '@/lib/auth'
import { markDonationPaid } from '@/lib/donations'
import { webhookSchema } from '@/lib/validation/schemas'

function validSecret(given: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret || !given) return false
  const a = Buffer.from(given), b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// POST: callback payment gateway. WAJIB menyertakan header `x-webhook-secret` = PAYMENT_WEBHOOK_SECRET.
// Tanpa autentikasi, siapa pun bisa menandai donasi sebagai lunas.
// Idempotent; collected_amount ditangani Trigger SQL (tidak dihitung di sini).
export async function POST(request: Request) {
  if (!process.env.PAYMENT_WEBHOOK_SECRET) return fail('Webhook belum dikonfigurasi', 503)
  if (!validSecret(request.headers.get('x-webhook-secret'))) return fail('Unauthorized', 401)

  const parsed = webhookSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Status pembayaran tidak valid', 400)

  const r = await markDonationPaid({ paymentReference: parsed.data.paymentReference })
  if (!r.ok) return fail(r.error, r.status)
  return json({
    success: true,
    idempotent: r.idempotent,
    message: r.idempotent ? 'Transaksi ini sudah pernah diproses sebelumnya' : 'Pembayaran berhasil dikonfirmasi',
  })
}

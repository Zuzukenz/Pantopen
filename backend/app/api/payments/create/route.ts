import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getUser, bearer, json, fail } from '@/lib/auth'
import { createPaymentSchema } from '@/lib/validation/schemas'

// POST: membuat donasi + transaksi pembayaran (status awal 'pending').
// Metode: 'qris_dana' (scan QR DANA) atau 'transfer_number' (transfer ke nomor e-wallet).
// Login bersifat OPSIONAL:
//  - dengan token valid  → donor_id = user.id
//  - tanpa token (tamu)  → donor_id = NULL, dilacak lewat guest_id (dari payload, atau dibuat server bila kosong)
//  - token ada tapi tidak valid → 401 (jangan diam-diam jadi tamu agar riwayat akun tidak hilang)
// Konfirmasi 'pending' → 'paid' dilakukan admin lewat /api/donations/confirm (atau webhook).
export async function POST(request: Request) {
  const parsed = createPaymentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Data pembayaran tidak valid', 400)
  const p = parsed.data

  let donorId: string | null = null
  if (bearer(request)) {
    const user = await getUser(request)
    if (!user) return fail('Sesi tidak valid. Silakan login ulang atau lanjutkan sebagai tamu.', 401)
    donorId = user.id
  }
  const guestId = donorId ? null : (p.guestId ?? randomUUID().replace(/-/g, ''))
  const method = p.provider === 'transfer_number' ? 'transfer_number' : 'qris_dana'

  // Kampanye harus ada, aktif, dan belum berakhir
  const { data: camp } = await supabaseAdmin.from('campaigns').select('id, status, end_at').eq('id', p.campaignId).maybeSingle()
  if (!camp) return fail('Kampanye tidak ditemukan', 404)
  if (camp.status !== 'active') return fail('Kampanye tidak sedang menerima donasi', 400)
  if (camp.end_at && new Date(camp.end_at).getTime() < Date.now()) return fail('Kampanye sudah berakhir', 400)

  // 1. Donasi berstatus awal 'pending'
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .insert({
      campaign_id: p.campaignId,
      amount: p.amount,
      donor_id: donorId,
      donor_name: p.donorName || null,
      guest_id: guestId,
      is_anonymous: p.isAnonymous ?? false,
      donor_message: p.donorMessage || '',
      status: 'pending',
      payment_reference: `BANTUYUK-TRX-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`,
    })
    .select('id, payment_reference, created_at')
    .single()
  if (donationError || !donation) { console.error('create donation:', donationError?.message); return fail('Gagal membuat donasi', 400) }

  // 2. Catatan transaksi pembayaran
  const { error: paymentError } = await supabaseAdmin.from('payment_transactions').insert({
    donation_id: donation.id,
    provider: method,
    provider_transaction_id: `PROV-${randomUUID().slice(0, 10).toUpperCase()}`,
    amount: p.amount,
    status: 'pending',
  })
  if (paymentError) {
    console.error('create payment_transaction:', paymentError.message)
    await supabaseAdmin.from('donations').delete().eq('id', donation.id)   // rollback agar tidak ada donasi yatim
    return fail('Gagal membuat transaksi pembayaran', 400)
  }

  return json({
    success: true,
    message: 'Inisiasi pembayaran berhasil dibuat',
    data: {
      donationId: donation.id,
      paymentReference: donation.payment_reference,
      amount: p.amount,
      method,
      status: 'pending',
      createdAt: donation.created_at,
      ...(guestId ? { guestId } : {}),           // simpan di browser untuk riwayat donasi tamu
      qrImage: '/assets/qr.png',                 // QR statis DANA (front end/assets/qr.png)
    },
  }, 201)
}

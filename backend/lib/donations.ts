import { supabaseAdmin } from '@/lib/supabase/admin'

export type PaidResult =
  | { ok: true; id: string; idempotent: boolean }
  | { ok: false; status: number; error: string }

// Ubah status donasi 'pending' → 'paid'. Dipakai oleh /api/donations/confirm dan webhook.
// - UPDATE bersyarat (status = 'pending') → atomik & idempotent: panggilan berulang / balapan dua request
//   tidak memproses donasi dua kali.
// - collected_amount di tabel campaigns TIDAK diubah di sini: ditangani Trigger SQL saat status jadi 'paid'.
export async function markDonationPaid(by: { id: string } | { paymentReference: string }): Promise<PaidResult> {
  const col = 'id' in by ? 'id' : 'payment_reference'
  const val = 'id' in by ? by.id : by.paymentReference
  const now = new Date().toISOString()

  const { data: updated, error } = await supabaseAdmin
    .from('donations')
    .update({ status: 'paid', updated_at: now })
    .eq(col, val)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) { console.error('markDonationPaid:', error.message); return { ok: false, status: 500, error: 'Gagal memperbarui donasi' } }

  if (updated) {
    // sinkronkan catatan transaksi pembayaran (best-effort; donasi sudah sah berstatus paid)
    const { error: e2 } = await supabaseAdmin
      .from('payment_transactions').update({ status: 'paid', paid_at: now }).eq('donation_id', updated.id).eq('status', 'pending')
    if (e2) console.error('payment_transactions sync:', e2.message)
    return { ok: true, id: updated.id, idempotent: false }
  }

  // Tidak ada baris 'pending' yang cocok → sudah paid (idempotent), tidak ada, atau status lain
  const { data: cur } = await supabaseAdmin.from('donations').select('id, status').eq(col, val).maybeSingle()
  if (!cur) return { ok: false, status: 404, error: 'Donasi tidak ditemukan' }
  if (cur.status === 'paid') return { ok: true, id: cur.id, idempotent: true }
  return { ok: false, status: 409, error: `Donasi berstatus '${cur.status}' dan tidak dapat dikonfirmasi` }
}

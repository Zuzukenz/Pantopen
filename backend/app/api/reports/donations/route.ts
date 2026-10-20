import { supabase } from '@/lib/supabase/client'
import { json, fail } from '@/lib/auth'

// GET: riwayat donasi 'paid' untuk transparansi publik (tidak memuat identitas donatur)
export async function GET() {
  const { data, error } = await supabase
    .from('donations')
    .select('id, amount, is_anonymous, status, created_at, campaigns ( title )')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) { console.error('reports/donations:', error.message); return fail('Gagal memuat laporan', 400) }
  return json({ success: true, count: data.length, data })
}

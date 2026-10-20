import { createClient } from '@supabase/supabase-js'

// Client service-role: HANYA dipakai di server (route API). Jangan diimpor ke kode browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

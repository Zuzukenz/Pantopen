// Konfigurasi donasi & backend. Ganti nilai sesuai akun sebenarnya.
window.BANTUYUK = {
  API_BASE: '',                 // URL backend + /api, mis. 'https://<backend-kamu>.vercel.app/api' (kosong = mode demo localStorage)
  SUPABASE_URL: '',             // https://<project>.supabase.co  (untuk login pengguna & Realtime)
  SUPABASE_ANON_KEY: '',        // anon/public key. AMAN di browser. JANGAN pernah isi service_role key di sini.
  QR_IMAGE: 'assets/qr.png',    // QR DANA dari gambar kamu
  PAY_ACCOUNTS: [               // opsi "Transfer ke Nomor / E-Wallet"
    { name: 'DANA',      number: '08xxxxxxxxxx', holder: 'a.n. BANTUYUK' },
    { name: 'GoPay',     number: '08xxxxxxxxxx', holder: 'a.n. BANTUYUK' },
    { name: 'OVO',       number: '08xxxxxxxxxx', holder: 'a.n. BANTUYUK' },
    { name: 'ShopeePay', number: '08xxxxxxxxxx', holder: 'a.n. BANTUYUK' }
  ],
  ADMIN_DEMO: { email: 'admin@bantuyuk.id', password: 'admin123' } // HANYA mode demo di localhost; produksi memakai Supabase (profiles.role = 'admin')
};

// Lapisan backend + Supabase untuk frontend (login pengguna, API, Realtime).
// Bila API_BASE kosong → mode demo (localStorage) seperti sebelumnya. Tampilan TIDAK diubah.
(function () {
  const B = window.BANTUYUK, API = window.API = {};
  API.base = String(B.API_BASE || '').replace(/\/+$/, '');
  API.on = !!API.base;
  API.local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  API.sb = (API.on && B.SUPABASE_URL && B.SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(B.SUPABASE_URL, B.SUPABASE_ANON_KEY) : null;

  /* ---------- HTTP ---------- */
  API.call = async (path, o = {}) => {
    const h = {};
    if (o.body !== undefined) h['Content-Type'] = 'application/json';
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    let r;
    try { r = await fetch(API.base + path, { method: o.method || 'GET', headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined }) }
    catch (_) { throw Object.assign(new Error('Tidak dapat terhubung ke server'), { status: 0 }) }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(typeof j.error === 'string' ? j.error : 'Permintaan gagal (' + r.status + ')'), { status: r.status });
    return j;
  };
  API.token = async () => { if (!API.sb) return null; const { data } = await API.sb.auth.getSession(); return data.session ? data.session.access_token : null };
  // id acak per perangkat untuk donasi tamu (donor_id = NULL di database)
  API.guestId = () => {
    let g = localStorage.getItem('bty_guest');
    if (!g) { g = 'g' + (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)); localStorage.setItem('bty_guest', g) }
    return g;
  };
  API.logout = async () => { try { if (API.sb) await API.sb.auth.signOut() } catch (_) {} localStorage.removeItem('bty_user'); location.href = 'login.html' };

  /* ---------- pemetaan data backend → bentuk data yang dipakai UI ---------- */
  const TYPE = { flood: 'Banjir', earthquake: 'Gempa Bumi', landslide: 'Tanah Longsor', wildfire: 'Kebakaran Hutan', other: 'Lainnya' };
  const METHOD = { qris_dana: 'QRIS / DANA', transfer_number: 'Transfer Nomor / E-Wallet' };
  const ROLE = { donor: 'Donatur', volunteer: 'Relawan', admin: 'Admin' };
  const num = v => Number(v) || 0, day = t => String(t || '').slice(0, 10), hm = t => new Date(t).toTimeString().slice(0, 5);
  const prov = r => { const p = r.payment_transactions; return METHOD[(Array.isArray(p) ? p[0] : p || {}).provider] || METHOD.qris_dana };
  const daysLeft = e => e ? Math.max(0, Math.ceil((new Date(e) - Date.now()) / 864e5)) : 0;

  // Nilai kolom geography dari Realtime berupa hex EWKB → {lat,lng} (backend melakukan hal yang sama untuk REST)
  API.parseLocation = v => {
    if (!v) return null;
    if (typeof v === 'object') return Array.isArray(v.coordinates) ? { lng: +v.coordinates[0], lat: +v.coordinates[1] } : null;
    const w = /POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(v); if (w) return { lng: +w[1], lat: +w[2] };
    if (!/^[0-9a-f]{42,}$/i.test(v)) return null;
    const b = new Uint8Array(v.match(/../g).map(h => parseInt(h, 16))), dv = new DataView(b.buffer), le = b[0] === 1;
    const off = 5 + (dv.getUint32(1, le) & 0x20000000 ? 4 : 0);
    return { lng: dv.getFloat64(off, le), lat: dv.getFloat64(off + 8, le) };
  };

  const map = API.map = {
    campaign: c => { const r = c.disaster || {}; return { id: c.id, title: c.title, cat: c.category, level: r.severity === 'critical' ? 'Kritis' : 'Sedang', loc: r.locationName || '-', lat: r.lat, lng: r.lng, target: num(c.target_amount), got: num(c.collected_amount), days: daysLeft(c.end_at), org: 'BANTUYUK', img: '', desc: c.description || '', status: c.status } },
    disaster: d => ({ id: d.id, name: d.title, type: TYPE[d.disaster_type] || 'Lainnya', level: d.severity, lat: d.lat, lng: d.lng, need: d.description, camp: null }),
    volunteer: v => ({ id: v.id, title: v.title, cat: v.category, loc: v.location_name, date: v.schedule, slots: v.slots, taken: v.taken, desc: v.description, img: v.image_url || '' }),
    news: n => ({ id: n.id, title: n.title, body: n.body, cat: n.category, time: Date.parse(n.created_at) }),
    notif: n => ({ id: n.id, newsId: n.news_id, title: n.title, body: n.body, time: Date.parse(n.created_at) }),
    donation: r => { const u = window.BTY_USER || {}; return { id: r.id, date: day(r.created_at), time: hm(r.created_at), camp: r.campaign_id, method: prov(r), amount: num(r.amount), status: r.status, user: u.email, donor: r.donor_name || (u.guest ? 'Tamu' : u.name), ref: r.payment_reference } },
    adminDonation: r => ({ id: r.id, date: day(r.created_at), camp: r.campaign_id, method: prov(r), amount: num(r.amount), status: r.status, donor: r.donor_name || (r.profiles && r.profiles.full_name) || 'Tamu' }),
    adminReg: r => ({ id: r.id, vid: r.event_id, name: (r.profiles && r.profiles.full_name) || '-', email: (r.profiles && r.profiles.email) || '' }),
  };

  /* ---------- pemuat data (mengisi DB cache; UI membaca DB seperti biasa) ---------- */
  const L = API.load = {
    campaigns: async () => DB.set('campaigns', (await API.call('/campaigns')).data.map(map.campaign)),
    disasters: async () => DB.set('disasters', (await API.call('/disasters')).data.map(map.disaster)),
    volunteers: async () => DB.set('volunteers', (await API.call('/volunteers')).data.map(map.volunteer)),
    news: async () => DB.set('news', (await API.call('/news')).data.map(map.news)),
    notifs: async () => DB.set('notifs', (await API.call('/notifications')).data.map(map.notif)),
    mine: async () => {
      const u = window.BTY_USER, t = await API.token();
      if (!t && !u.guest) return;
      const r = await API.call('/donations/mine' + (t ? '' : '?guestId=' + encodeURIComponent(API.guestId())), { token: t });
      DB.set('donations', r.data.map(map.donation));
    },
    regs: async () => {
      const u = window.BTY_USER; if (!API.sb || u.guest) return DB.set('regs', []);
      const { data } = await API.sb.from('volunteer_registrations').select('event_id').eq('user_id', u.id);   // dibatasi RLS: hanya milik sendiri
      DB.set('regs', (data || []).map(r => ({ id: r.event_id, vid: r.event_id, name: u.name, email: u.email, time: Date.now() })));
    },
  };
  API.loadAll = () => Promise.allSettled(['campaigns', 'disasters', 'news', 'notifs', 'regs', 'volunteers', 'mine'].map(k => L[k]()));

  /* ---------- donasi ---------- */
  // Membuat donasi berstatus 'pending'. Pengguna login → token dikirim (donor_id = user); tamu → guestId (donor_id = NULL).
  API.createDonation = async p => {
    const u = window.BTY_USER, t = await API.token();
    if (!u.guest && !t) throw new Error('Sesi berakhir, silakan login ulang');
    const body = { campaignId: p.campaignId, amount: p.amount, provider: p.provider };
    if (p.donorName) body.donorName = p.donorName;
    if (!t) body.guestId = API.guestId();
    const r = (await API.call('/payments/create', { method: 'POST', body, token: t })).data;
    return { id: r.donationId, date: day(r.createdAt), time: hm(r.createdAt), camp: p.campaignId, method: METHOD[r.method], amount: r.amount, status: 'pending', user: u.email, donor: p.donorName || (u.guest ? 'Tamu' : u.name), ref: r.paymentReference };
  };

  /* ---------- Supabase Realtime ---------- */
  API.subscribe = () => {
    const sb = API.sb; if (!sb) return;
    const timers = {}, later = (k, fn) => { clearTimeout(timers[k]); timers[k] = setTimeout(() => fn().catch(() => {}), 400) };
    const pg = (table, event, fn) => ({ table, event, fn });
    const handlers = [
      // campaigns: progress bar (collected_amount diubah Trigger SQL) langsung ter-update tanpa reload
      pg('campaigns', '*', p => {
        const n = p.new || {}, id = n.id || (p.old || {}).id, cs = DB.get('campaigns').slice(), i = cs.findIndex(c => c.id === id);
        if (p.eventType === 'DELETE' || (n.status && n.status !== 'active')) { if (i >= 0) { cs.splice(i, 1); DB.set('campaigns', cs) } return }
        if (i < 0) return later('campaigns', L.campaigns);                                    // kampanye baru → ambil lengkap (dengan lokasi)
        cs[i] = { ...cs[i], title: n.title, cat: n.category, desc: n.description, target: num(n.target_amount), got: num(n.collected_amount), days: daysLeft(n.end_at) };
        DB.set('campaigns', cs);
      }),
      // disaster_reports: marker peta GIS diperbarui langsung
      pg('disaster_reports', '*', () => later('disasters', L.disasters)),
      // donations: riwayat & status donasi milik sendiri
      pg('donations', '*', p => {
        const n = p.new || {}, u = window.BTY_USER || {};
        const mine = (n.donor_id && n.donor_id === u.id) || (n.guest_id && n.guest_id === localStorage.getItem('bty_guest'));
        if (!mine) return;
        const prev = DB.get('donations').find(d => d.id === n.id);
        if (n.status === 'paid' && prev && prev.status !== 'paid' && window.toast) window.toast('Donasi dikonfirmasi', 'Terima kasih, donasi Anda sudah diterima.');
        later('mine', L.mine);
      }),
      pg('news', '*', () => later('news', L.news)),
      pg('notifications', 'INSERT', p => { const n = map.notif(p.new); DB.set('notifs', [n, ...DB.get('notifs').filter(x => x.id !== n.id)]) }),
    ];
    const ch = sb.channel('bty-live');
    handlers.forEach(h => ch.on('postgres_changes', { event: h.event, schema: 'public', table: h.table }, h.fn));
    ch.subscribe();
  };

  /* ---------- boot halaman pengguna: sesi harus valid di Supabase; localStorage tidak menentukan akses ---------- */
  API.boot = async () => {
    if (!API.on) {                                         // mode demo (tanpa backend)
      window.BTY_USER = JSON.parse(localStorage.getItem('bty_user') || 'null');
      if (!window.BTY_USER) { location.replace('login.html'); return false }
      return true;
    }
    let u = null;
    if (API.sb) {
      const { data } = await API.sb.auth.getSession(), s = data.session;
      if (s) {
        const md = s.user.user_metadata || {};
        u = { id: s.user.id, email: s.user.email, name: md.full_name || (s.user.email || 'User').split('@')[0], role: 'Donatur', guest: false };
        try {
          const p = (await API.call('/me', { token: s.access_token })).data;
          u.name = p.full_name || u.name; u.role = md.display_role || ROLE[p.role] || 'Donatur';
        } catch (e) { if (e.status === 401) { await API.sb.auth.signOut(); u = null } }
      }
    }
    if (!u) { const g = JSON.parse(localStorage.getItem('bty_user') || 'null'); if (g && g.guest) u = { name: 'Tamu', email: 'guest-' + API.guestId(), role: 'Tamu', guest: true } }   // tamu: tanpa hak istimewa
    if (!u) { location.replace('login.html'); return false }
    window.BTY_USER = u;
    await API.loadAll();
    API.subscribe();
    return true;
  };
})();

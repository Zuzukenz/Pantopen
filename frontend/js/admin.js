const $ = id => document.getElementById(id), E = DB.esc;
const adm = JSON.parse(sessionStorage.getItem('bty_admin') || 'null'); if (!adm) location.replace('admin-login.html');
function kick() { sessionStorage.removeItem('bty_admin'); location.replace('admin-login.html') }
// Semua request admin membawa token; 401/403 dari backend = sesi tidak sah → keluar
async function api(path, o = {}) { try { return await API.call(path, {...o, token: adm.token}) } catch (e) { if (e.status === 401 || e.status === 403) kick(); throw e } }
// Validasi sesi ke backend (token Supabase + profiles.role = 'admin'). localStorage/sessionStorage saja TIDAK cukup untuk masuk.
async function guard() {
  if (!adm) return false;
  if (!API.on) { if (API.local && adm.demo) return true; kick(); return false }   // mode demo hanya di localhost
  try { await API.call('/admin/verify', {token: adm.token}); return true } catch (_) { kick(); return false }
}
async function load() {   // mode backend: isi cache dari API
  if (!API.on) return;
  const [cs, dn, vs, ns, rg] = await Promise.all([api('/campaigns?status=all'), api('/admin/donations'), api('/volunteers'), api('/news'), api('/admin/registrations')]);
  DB.set('campaigns', cs.data.map(API.map.campaign)); DB.set('donations', dn.data.map(API.map.adminDonation));
  DB.set('volunteers', vs.data.map(API.map.volunteer)); DB.set('news', ns.data.map(API.map.news)); DB.set('regs', rg.data.map(API.map.adminReg));
}
const again = async v => { try { await load() } catch (e) { toast('Gagal memuat data', e.message) } V[v]() };
const T = [['ringkasan', 'Ringkasan', 'home'], ['berita', 'Berita', 'news'], ['kampanye', 'Kampanye', 'heart'], ['relawan', 'Relawan', 'users'], ['donasi', 'Donasi', 'file']];
let cur = 'ringkasan';
$('logo').innerHTML = I('shield', 24) + ' ADMIN'; $('mb').innerHTML = I('menu'); $('lo').innerHTML = I('out') + ' Keluar';
$('nav').innerHTML = T.map(t => `<button class="nav" data-t="${t[0]}">${I(t[2])}${t[1]}</button>`).join('');
$('bn').innerHTML = T.map(t => `<button data-t="${t[0]}">${I(t[2], 20)}${t[1]}</button>`).join('');
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => go(b.dataset.t));
$('lo').onclick = () => { sessionStorage.removeItem('bty_admin'); location.href = 'admin-login.html' };
const sd = () => { $('side').classList.toggle('open'); $('scrim').classList.toggle('on') }; $('mb').onclick = sd; $('scrim').onclick = sd;
function toast(t, b = '') { const d = document.createElement('div'); d.innerHTML = `<b>${E(t)}</b><div class="muted">${E(b)}</div>`; $('toast').append(d); setTimeout(() => d.remove(), 4000) }
async function go(v) { cur = v; document.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === v)); $('ttl').textContent = T.find(t => t[0] === v)[1]; $('side').classList.remove('open'); $('scrim').classList.remove('on'); try { await load() } catch (e) { toast('Gagal memuat data', e.message) } V[v]() }
const ok = (m) => confirm(m);
const V = {
  ringkasan() {
    const cs = DB.get('campaigns'), dn = DB.get('donations');
    $('c').innerHTML = `<div class="grid g4 keep"><div class="card stat"><span class="muted">Dana terkumpul</span><b>${DB.rp(cs.reduce((a, c) => a + c.got, 0))}</b></div><div class="card stat"><span class="muted">Donasi menunggu</span><b>${dn.filter(d => d.status === 'pending').length}</b></div>
    <div class="card stat"><span class="muted">Berita</span><b>${DB.get('news').length}</b></div><div class="card stat"><span class="muted">Pendaftar relawan</span><b>${DB.get('regs').length}</b></div></div>
    <p class="muted" style="margin-top:16px">Gunakan menu untuk menambah berita (notifikasi otomatis terkirim ke semua pengguna), kampanye, kegiatan relawan, dan konfirmasi donasi.</p>`;
  },
  berita() {
    $('c').innerHTML = `<div class="grid g2"><form class="card" id="nf"><h2>Tambah Berita</h2><label class="f">Judul</label><input id="nt" required maxlength="120"><label class="f">Kategori</label><select id="nc"><option>Bencana</option><option>Donasi</option><option>Relawan</option><option>Pengumuman</option></select>
    <label class="f">Isi berita</label><textarea id="nb" required></textarea><button class="btn block" style="margin-top:14px">${I('plus')} Terbitkan & Kirim Notifikasi</button></form>
    <div class="card"><h2 style="margin-bottom:8px">Daftar Berita</h2>${DB.get('news').map(n => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="grow"><b>${E(n.title)}</b><div class="muted" style="font-size:12px">${E(n.cat)} · ${DB.ago(n.time)}</div></div><button class="btn danger sm" data-d="${n.id}">${I('trash', 14)}</button></div>`).join('') || '<div class="empty">Kosong</div>'}</div></div>`;
    $('nf').onsubmit = async e => {
      e.preventDefault(); const n = {title: nt.value.trim(), cat: nc.value, body: nb.value.trim()};
      if (API.on) {   // notifikasi dibuat otomatis oleh trigger DB; tidak ditambah lagi di sisi klien
        try { await api('/news', {method: 'POST', body: n}) } catch (er) { return toast('Gagal menerbitkan berita', er.message) }
        toast('Berita terbit', 'Notifikasi dikirim ke semua pengguna'); return again('berita');
      }
      DB.addNews(n); toast('Berita terbit', 'Notifikasi dikirim ke semua pengguna'); V.berita();
    };
    $('c').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!ok('Hapus berita ini?')) return;
      if (API.on) { try { await api('/news?id=' + encodeURIComponent(b.dataset.d), {method: 'DELETE'}) } catch (er) { return toast('Gagal menghapus', er.message) } return again('berita') }
      DB.set('news', DB.get('news').filter(n => n.id !== b.dataset.d)); V.berita();
    });
  },
  kampanye() {
    $('c').innerHTML = `<div class="grid g2"><form class="card" id="kf"><h2>Tambah Kampanye</h2><label class="f">Judul</label><input id="kt" required><label class="f">Kategori</label><select id="kc"><option>Bencana</option><option>Pendidikan</option><option>Kesehatan</option></select><label class="f">Tingkat</label><select id="kv"><option>Kritis</option><option selected>Sedang</option></select>
    <label class="f">Lokasi</label><input id="kl" required placeholder="Kota, Provinsi"><div class="grid g2"><div><label class="f">Latitude</label><input id="ka" type="number" step="any" required></div><div><label class="f">Longitude</label><input id="ko" type="number" step="any" required></div></div>
    <label class="f">Target (Rp)</label><input id="kg" type="number" min="1000" required><label class="f">Lama (hari)</label><input id="kd" type="number" min="1" value="30"><label class="f">URL gambar (opsional)</label><input id="ki"><label class="f">Deskripsi</label><textarea id="kx" required></textarea>
    <button class="btn block" style="margin-top:14px">${I('plus')} Tambah</button></form>
    <div class="card"><h2 style="margin-bottom:8px">Kampanye</h2>${DB.get('campaigns').map(c => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="grow"><b>${E(c.title)}</b><div class="muted" style="font-size:12px">${DB.rp(c.got)} / ${DB.rp(c.target)}</div></div><button class="btn danger sm" data-d="${c.id}">${I('trash', 14)}</button></div>`).join('')}</div></div>`;
    $('kf').onsubmit = async e => { e.preventDefault();
      if (API.on) {
        try { await api('/campaigns', {method: 'POST', body: {title: kt.value.trim(), category: kc.value, description: kx.value.trim(), targetAmount: +kg.value, days: +kd.value || 30, locationName: kl.value.trim(), latitude: +ka.value, longitude: +ko.value, severity: kv.value === 'Kritis' ? 'critical' : 'medium', status: 'active'}}) } catch (er) { return toast('Gagal menambah kampanye', er.message) }
        toast('Kampanye ditambahkan'); return again('kampanye');
      }
      DB.set('campaigns', [...DB.get('campaigns'), {id: DB.uid(), title: kt.value, cat: kc.value, level: kv.value, loc: kl.value, lat: +ka.value, lng: +ko.value, target: +kg.value, got: 0, days: +kd.value, org: 'BANTUYUK', img: ki.value, desc: kx.value}]); toast('Kampanye ditambahkan'); V.kampanye() };
    $('c').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!ok('Hapus kampanye?')) return;
      if (API.on) { try { await api('/campaigns?id=' + encodeURIComponent(b.dataset.d), {method: 'DELETE'}) } catch (er) { return toast('Gagal menghapus', er.message) } return again('kampanye') }
      DB.set('campaigns', DB.get('campaigns').filter(c => c.id !== b.dataset.d)); V.kampanye();
    });
  },
  relawan() {
    const rg = DB.get('regs');
    $('c').innerHTML = `<div class="grid g2"><form class="card" id="rf"><h2>Tambah Kegiatan Relawan</h2><label class="f">Nama kegiatan</label><input id="rt" required><label class="f">Kategori</label><input id="rc" required placeholder="Dapur Umum / Logistik / Edukasi"><label class="f">Lokasi</label><input id="rl" required>
    <label class="f">Jadwal</label><input id="rd" required placeholder="15–20 Okt 2026"><label class="f">Kuota</label><input id="rs" type="number" min="1" required><label class="f">URL gambar (opsional)</label><input id="ri"><label class="f">Deskripsi</label><textarea id="rx" required></textarea>
    <button class="btn block" style="margin-top:14px">${I('plus')} Tambah</button></form>
    <div><div class="card" style="margin-bottom:14px"><h2 style="margin-bottom:8px">Kegiatan</h2>${DB.get('volunteers').map(v => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="grow"><b>${E(v.title)}</b><div class="muted" style="font-size:12px">${v.taken}/${v.slots} slot · ${E(v.date)}</div></div><button class="btn danger sm" data-d="${v.id}">${I('trash', 14)}</button></div>`).join('')}</div>
    <div class="card tw"><h2 style="margin-bottom:8px">Pendaftar</h2><table><tr><th>Nama</th><th>Kegiatan</th></tr>${rg.map(r => `<tr><td>${E(r.name)}<div class="muted" style="font-size:11px">${E(r.email)}</div></td><td>${E(DB.get('volunteers').find(v => v.id === r.vid)?.title || '-')}</td></tr>`).join('') || '<tr><td colspan=2 class="empty">Belum ada pendaftar</td></tr>'}</table></div></div></div>`;
    $('rf').onsubmit = async e => { e.preventDefault();
      if (API.on) {
        try {
          await api('/volunteers', {method: 'POST', body: {title: rt.value.trim(), category: rc.value.trim(), locationName: rl.value.trim(), schedule: rd.value.trim(), slots: +rs.value, description: rx.value.trim(), ...(ri.value.trim() ? {imageUrl: ri.value.trim()} : {})}});
          await api('/news', {method: 'POST', body: {title: 'Relawan dibuka: ' + rt.value.trim(), body: `${rl.value} · ${rd.value}. Daftar sekarang di menu Relawan.`, cat: 'Relawan'}}).catch(() => {});
        } catch (er) { return toast('Gagal menambah kegiatan', er.message) }
        toast('Kegiatan ditambahkan'); return again('relawan');
      }
      DB.set('volunteers', [...DB.get('volunteers'), {id: DB.uid(), title: rt.value, cat: rc.value, loc: rl.value, date: rd.value, slots: +rs.value, taken: 0, desc: rx.value, img: ri.value}]); DB.addNews({title: 'Relawan dibuka: ' + rt.value, body: `${rl.value} · ${rd.value}. Daftar sekarang di menu Relawan.`, cat: 'Relawan'}); toast('Kegiatan ditambahkan'); V.relawan() };
    $('c').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!ok('Hapus kegiatan?')) return;
      if (API.on) { try { await api('/volunteers?id=' + encodeURIComponent(b.dataset.d), {method: 'DELETE'}) } catch (er) { return toast('Gagal menghapus', er.message) } return again('relawan') }
      DB.set('volunteers', DB.get('volunteers').filter(v => v.id !== b.dataset.d)); V.relawan();
    });
  },
  donasi() {
    const cs = DB.get('campaigns');
    $('c').innerHTML = `<div class="card tw"><h2 style="margin-bottom:8px">Konfirmasi Donasi</h2><table><tr><th>Tanggal</th><th>Donatur</th><th>Kampanye</th><th>Metode</th><th>Nominal</th><th>Status</th></tr>${DB.get('donations').map(d => `<tr><td>${d.date}</td><td>${E(d.donor || d.user)}</td><td>${E(cs.find(c => c.id === d.camp)?.title || '-')}</td><td>${E(d.method)}</td><td>${DB.rp(d.amount)}</td>
    <td>${d.status === 'paid' ? '<span class="badge ok">Berhasil</span>' : d.status === 'pending' ? `<button class="btn sm" data-p="${d.id}">Konfirmasi</button>` : `<span class="badge">${E(d.status)}</span>`}</td></tr>`).join('')}</table></div>`;
    $('c').querySelectorAll('[data-p]').forEach(b => b.onclick = async () => {
      if (b.disabled) return; b.disabled = true;          // cegah klik ganda; server juga idempotent
      if (API.on) {
        // POST /api/donations/confirm: 'pending' → 'paid'. collected_amount dihitung Trigger SQL di database, bukan di sini.
        try { const r = await api('/donations/confirm', {method: 'POST', body: {donationId: b.dataset.p}}); toast(r.idempotent ? 'Donasi sudah terkonfirmasi' : 'Donasi dikonfirmasi') }
        catch (er) { toast('Gagal mengonfirmasi donasi', er.message) }
        return again('donasi');
      }
      const ds = DB.get('donations'), d = ds.find(x => x.id === b.dataset.p); d.status = 'paid'; DB.set('donations', ds);
      const c = DB.get('campaigns'), k = c.find(x => x.id === d.camp); if (k) { k.got += d.amount; DB.set('campaigns', c) } toast('Donasi dikonfirmasi'); V.donasi();
    });
  }
};
guard().then(okk => { if (okk) { document.documentElement.style.visibility = ''; go('ringkasan') } });

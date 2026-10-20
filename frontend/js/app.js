const BC = window.BANTUYUK, $ = id => document.getElementById(id), E = DB.esc;
const user = window.BTY_USER;   // diisi API.boot(): di mode backend berasal dari sesi Supabase yang tervalidasi, bukan dari localStorage
if (!user) location.replace('login.html');
const NAV = [['dashboard','Dashboard','home'],['gis','Peta GIS','map'],['donasi','Donasi','heart'],['laporan','Laporan','file'],['relawan','Relawan','users'],['berita','Berita','news'],['pengaturan','Pengaturan','gear']];
const BOT = ['dashboard','gis','donasi','relawan','berita'];
let cur = 'dashboard', selC = null, cat = 'Semua', pay = 'qris', amt = 100000, qtext = '';
const DEF = {dark: true, eonet: true, firms: false, kampanye: true, posko: true, cluster: true, legend: true, zoom: 5, region: 'id', days: 1, types: {Banjir: true, 'Gempa Bumi': true, 'Tanah Longsor': true, 'Kebakaran Hutan': true, 'Gunung Api': true, Badai: true, Lainnya: true}};
let map, layers = {}, S = (() => { try { const x = JSON.parse(localStorage.getItem('bty_gis2') || '{}'); return {...DEF, ...x, types: {...DEF.types, ...(x.types || {})}} } catch (_) { return DEF } })();
const saveS = () => localStorage.setItem('bty_gis2', JSON.stringify(S));

/* ---------- shell ---------- */
$('logo').innerHTML = I('shield',24) + ' BANTUYUK'; $('lo').innerHTML = I('out'); $('mb').innerHTML = I('menu'); $('bell').insertAdjacentHTML('afterbegin', I('bell'));
$('un').textContent = user.name; $('ur').textContent = user.guest ? 'Tamu (tanpa akun)' : user.role; $('av').textContent = user.name[0].toUpperCase();
$('lo').onclick = () => API.logout();
$('nav').innerHTML = NAV.map(n => `<button class="nav" data-t="${n[0]}">${I(n[2])}<span>${n[1]}</span></button>`).join('');
$('bn').innerHTML = BOT.map(k => { const n = NAV.find(x => x[0] === k); return `<button data-t="${k}">${I(n[2],20)}${n[1]}</button>` }).join('');
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => go(b.dataset.t));
const side = () => { $('side').classList.toggle('open'); $('scrim').classList.toggle('on') };
$('mb').onclick = side; $('scrim').onclick = side;
$('q').oninput = e => { qtext = e.target.value.toLowerCase(); if (cur !== 'donasi') go('donasi'); else renderList() };
function toast(t, b = '') { const d = document.createElement('div'); d.innerHTML = `<b>${E(t)}</b><div class="muted" style="margin-top:2px">${E(b)}</div>`; $('toast').append(d); setTimeout(() => d.remove(), 5000) }

function go(v, keep) {
  cur = v; document.querySelectorAll('.view').forEach(e => e.classList.toggle('on', e.id === 'v-' + v));
  document.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === v));
  $('side').classList.remove('open'); $('scrim').classList.remove('on'); $('pop').classList.remove('on');
  ({dashboard, gis, donasi, laporan, relawan, berita, pengaturan})[v](); if (!keep) scrollTo(0, 0); document.querySelector('.content').scrollTop = 0;
}

/* ---------- notifikasi realtime ---------- */
let known = new Set(DB.get('notifs').map(n => n.id)), seen = +(localStorage.getItem('bty_seen_' + user.email) || 0);
function bellRender() {
  const ns = DB.get('notifs'), un = ns.filter(n => n.time > seen).length;
  $('bd').style.display = un ? 'grid' : 'none'; $('bd').textContent = un;
  $('pop').innerHTML = `<h3 style="margin-bottom:10px">Notifikasi</h3>` + (ns.length ? ns.map(n => `<div class="notif ${n.time > seen ? 'new' : ''}"><b>${E(n.title)}</b><div class="muted" style="font-size:12px">${E(n.body)}</div><div class="muted" style="font-size:11px;margin-top:4px">${DB.ago(n.time)}</div></div>`).join('') : '<div class="empty">Belum ada notifikasi</div>');
}
$('bell').onclick = () => { $('pop').classList.toggle('on'); if ($('pop').classList.contains('on')) { seen = Date.now(); localStorage.setItem('bty_seen_' + user.email, seen); setTimeout(() => { $('bd').style.display = 'none' }, 0) } };
DB.on(k => {
  if (k === 'notifs') { DB.get('notifs').filter(n => !known.has(n.id)).forEach(n => { known.add(n.id); toast('📢 Berita baru', n.title); if (navigator.vibrate) navigator.vibrate(100) }); bellRender() }
  if (['news', 'campaigns', 'volunteers', 'donations', 'disasters'].includes(k)) {
    if (cur === 'gis') { if (k === 'campaigns' || k === 'disasters') drawMap() }          // Realtime: marker peta diperbarui tanpa reload
    else if (cur === 'donasi' && k === 'campaigns') { renderList(); if (!$('cd').contains(document.activeElement)) renderDetail() }   // Realtime: progress bar live tanpa mengganggu pengisian form
    else go(cur, true);
  }
});

/* ---------- dashboard ---------- */
function dashboard() {
  const cs = DB.get('campaigns'), tot = cs.reduce((a, c) => a + c.got, 0), n = DB.get('news'), vs = DB.get('volunteers');
  $('v-dashboard').innerHTML = `<div class="title">${I('home')} Dashboard</div>
  <div class="grid g4 keep"><div class="card stat"><span class="muted">Total terkumpul</span><b>${DB.rp(tot)}</b></div><div class="card stat"><span class="muted">Kampanye aktif</span><b>${cs.length}</b></div>
  <div class="card stat"><span class="muted">Titik bencana</span><b>${DB.get('disasters').filter(d => d.type !== 'Posko').length}</b></div><div class="card stat"><span class="muted">Slot relawan</span><b>${vs.reduce((a, v) => a + v.slots - v.taken, 0)}</b></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h2 style="margin-bottom:10px">Berita Terbaru</h2>${n.slice(0, 4).map(x => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${E(x.title)}</b><div class="muted" style="font-size:12px">${E(x.cat)} · ${DB.ago(x.time)}</div></div>`).join('') || '<div class="empty">Belum ada berita</div>'}</div>
  <div class="card"><h2 style="margin-bottom:10px">Kampanye Berjalan</h2>${cs.map(c => `<div style="margin-bottom:12px;cursor:pointer" onclick="selC='${c.id}';go('donasi')"><div class="row between"><b>${E(c.title)}</b><span class="muted">${Math.round(c.got / c.target * 100)}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${c.got / c.target * 100}%"></i></div></div>`).join('')}</div></div>`;
}

/* ---------- GIS: Leaflet + OSM, NASA EONET (marker, cluster) + NASA FIRMS (heatmap) ---------- */
const GT = {floods: ['Banjir', '#3b82f6'], earthquakes: ['Gempa Bumi', '#f59e0b'], landslides: ['Tanah Longsor', '#a16207'], wildfires: ['Kebakaran Hutan', '#ef4444'], volcanoes: ['Gunung Api', '#f97316'], severeStorms: ['Badai', '#8b5cf6']};
const gt = id => GT[id] || ['Lainnya', '#94a3b8'];
const EONET = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const BB = {id: {eonet: '94,7,142,-12', firms: '95,-11,141,6'}, world: {eonet: '', firms: '95,-11,141,6'}}; // EONET: minLon,maxLat,maxLon,minLat · FIRMS: west,south,east,north
let drawId = 0;
const gstat = t => { const e = $('gs'); if (e) e.textContent = t };
function norm(e) {
  const g = e.geometry && e.geometry[e.geometry.length - 1]; if (!g) return null; let ll;
  if (g.type === 'Point') ll = [g.coordinates[1], g.coordinates[0]];
  else { const r = g.coordinates[0] || []; if (!r.length) return null; ll = [r.reduce((a, c) => a + c[1], 0) / r.length, r.reduce((a, c) => a + c[0], 0) / r.length] }
  const c = e.categories && e.categories[0] || {}, [type, col] = gt(c.id);
  return {id: e.id, name: e.title, type, col, cat: c.title || '', lat: ll[0], lng: ll[1], date: g.date, mag: g.magnitudeValue != null ? g.magnitudeValue + ' ' + (g.magnitudeUnit || '') : '', link: e.link, desc: e.description || ''};
}
async function loadEonet(force) {
  const k = 'bty_eonet_' + S.region, c = JSON.parse(sessionStorage.getItem(k) || 'null');
  if (c && !force && Date.now() - c.t < 6e5) return c.d;           // cache 10 mnt agar hemat request
  const q = new URLSearchParams({status: 'open', limit: '300'}); if (BB[S.region].eonet) q.set('bbox', BB[S.region].eonet);
  const r = await fetch(EONET + '?' + q); if (!r.ok) throw new Error('EONET ' + r.status);
  const d = (await r.json()).events.map(norm).filter(Boolean);
  try { sessionStorage.setItem(k, JSON.stringify({t: Date.now(), d})) } catch (_) {}
  return d;
}
async function loadFirms() {
  if (!BC.API_BASE) { gstat('Hotspot FIRMS butuh backend: isi API_BASE di js/config.js (API key FIRMS disimpan di server, bukan di browser).'); return [] }
  const r = await fetch(`${BC.API_BASE}/gis/firms?days=${S.days}&bbox=${BB[S.region].firms}`); if (!r.ok) throw new Error('FIRMS ' + r.status);
  return (await r.json()).points || [];
}
function gis() {
  $('t-gis').innerHTML = I('map') + ' Peta GIS';
  const cb = (k, l, v, t) => `<label><input type="checkbox" ${t ? 'data-t' : 'data-k'}="${k}" ${v ? 'checked' : ''}> ${l}</label>`;
  $('gf').innerHTML = `<h3>Sumber Data</h3>${cb('eonet', 'NASA EONET (live)', S.eonet)}${cb('firms', 'Hotspot NASA FIRMS', S.firms)}${cb('kampanye', 'Kampanye Donasi', S.kampanye)}${cb('posko', 'Posko Bantuan', S.posko)}
   <h3 style="margin-top:12px">Jenis Bencana</h3>${Object.values(GT).map(x => x[0]).concat('Lainnya').map(k => cb(k, k, S.types[k], 1)).join('')}
   <h3 style="margin-top:12px">Wilayah</h3><select data-k="region"><option value="id" ${S.region === 'id' ? 'selected' : ''}>Indonesia</option><option value="world" ${S.region === 'world' ? 'selected' : ''}>Dunia</option></select>
   <h3 style="margin-top:12px">Hotspot (hari)</h3><select data-k="days">${[1, 2, 3].map(d => `<option ${S.days == d ? 'selected' : ''}>${d}</option>`).join('')}</select>
   <button class="btn ghost sm block" id="gr" style="margin-top:12px">Muat ulang data</button><p class="mc-tip" id="gs" style="margin-top:10px"></p>`;
  $('gf').querySelectorAll('[data-k],[data-t]').forEach(i => i.onchange = () => {
    if (i.dataset.t) S.types[i.dataset.t] = i.checked; else S[i.dataset.k] = i.type === 'checkbox' ? i.checked : (i.dataset.k === 'days' ? +i.value : i.value);
    saveS(); drawMap();
  });
  $('gr').onclick = () => drawMap(true);
  if (!map) map = L.map('map').setView([-2.5, 118], S.zoom);
  setTile(); drawMap(); setTimeout(() => map.invalidateSize(), 150);
  $('legend').style.display = S.legend ? 'flex' : 'none';
  $('legend').innerHTML = [...Object.values(GT), ['Lainnya', '#94a3b8'], ['Kampanye Donasi', '#18b8e8'], ['Posko Bantuan', '#22c55e']].map(x => `<span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:50%;background:${x[1]}"></i>${x[0]}</span>`).join('') + `<span class="row" style="gap:5px"><i style="width:30px;height:8px;border-radius:5px;background:linear-gradient(90deg,#3b82f6,#facc15,#ef4444)"></i>Hotspot api (FIRMS)</span>`;
}
function setTile() {
  if (layers.tile) map.removeLayer(layers.tile);
  layers.tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap contributors', maxZoom: 19}).addTo(map);
  $('map').classList.toggle('dark-tiles', !!S.dark);   // mode gelap = OSM dengan filter warna
}
const pinIcon = c => L.divIcon({className: '', iconSize: [18, 18], iconAnchor: [9, 18], html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${c};border:2px solid #fff;box-shadow:0 0 8px ${c}"></div>`});
async function drawMap(force) {
  if (!map) return; const my = ++drawId;
  [layers.g, layers.h].forEach(l => l && map.removeLayer(l)); layers.g = layers.h = null;
  const grp = S.cluster && L.markerClusterGroup ? L.markerClusterGroup({maxClusterRadius: 45}) : L.layerGroup();
  if (S.posko) DB.get('disasters').filter(d => d.type === 'Posko').forEach(d => L.marker([d.lat, d.lng], {icon: pinIcon('#22c55e')}).addTo(grp).on('click', () => detail(d)));
  const colOf = t => (Object.values(GT).find(x => x[0] === t) || ['', '#94a3b8'])[1], okLL = d => Number.isFinite(d.lat) && Number.isFinite(d.lng);
  DB.get('disasters').filter(d => d.type !== 'Posko' && S.types[d.type] !== false && okLL(d)).forEach(d => L.marker([d.lat, d.lng], {icon: pinIcon(colOf(d.type))}).addTo(grp).on('click', () => detail(d)));
  if (S.kampanye) DB.get('campaigns').filter(okLL).forEach(c => L.marker([c.lat, c.lng], {icon: pinIcon('#18b8e8')}).addTo(grp).on('click', () => detail({name: c.title, type: 'Kampanye Donasi', level: '-', lat: c.lat, lng: c.lng, need: c.desc, camp: c.id})));
  grp.addTo(map); layers.g = grp; let msg = [];
  if (S.eonet) {
    gstat('Memuat data NASA EONET…');
    try {
      const ev = await loadEonet(force); if (my !== drawId) return;
      const shown = ev.filter(e => S.types[e.type]); shown.forEach(e => L.marker([e.lat, e.lng], {icon: pinIcon(e.col)}).addTo(grp).on('click', () => detailEv(e)));
      msg.push(`EONET: ${shown.length} dari ${ev.length} kejadian aktif`);
    } catch (err) { msg.push('EONET gagal dimuat (' + err.message + ')') }
  }
  if (S.firms) {
    try {
      const pts = await loadFirms(); if (my !== drawId) return;
      if (pts.length && L.heatLayer) { layers.h = L.heatLayer(pts, {radius: 12, blur: 16, maxZoom: 10, gradient: {.3: '#3b82f6', .6: '#facc15', 1: '#ef4444'}}).addTo(map); msg.push(`FIRMS: ${pts.length} titik panas`) }
      else if (BC.API_BASE) msg.push('FIRMS: tidak ada titik panas')
    } catch (err) { msg.push('FIRMS gagal dimuat (' + err.message + ')') }
  }
  if (msg.length) gstat(msg.join(' · ') + ' · ' + new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}));
}
function detail(d) {
  $('gd').innerHTML = `<h2>${E(d.name)}</h2><div style="margin:6px 0 10px"><span class="badge">${E(d.type)}</span></div>
   <div class="muted" style="font-size:12px">Kebutuhan / keterangan</div><p style="margin-bottom:10px">${E(d.need)}</p>
   <div class="muted" style="font-size:12px">Koordinat</div><p style="margin-bottom:12px">${d.lat.toFixed(4)}°, ${d.lng.toFixed(4)}°</p>
   ${d.camp ? `<button class="btn block" onclick="selC='${E(d.camp)}';go('donasi')">Lihat Kampanye</button>` : ''}`;
  $('gd').scrollIntoView({behavior: 'smooth', block: 'nearest'});
}
function detailEv(d) {
  const safe = /^https:\/\//.test(d.link || '');
  $('gd').innerHTML = `<h2>${E(d.name)}</h2><div class="row wrap" style="margin:6px 0 10px"><span class="badge" style="background:${d.col}33;color:${d.col}">${E(d.type)}</span><span class="badge">NASA EONET</span></div>
   ${d.desc ? `<p class="muted" style="margin-bottom:10px">${E(d.desc)}</p>` : ''}
   <div class="muted" style="font-size:12px">Pembaruan terakhir</div><p style="margin-bottom:8px">${E(new Date(d.date).toLocaleString('id-ID'))}</p>
   ${d.mag ? `<div class="muted" style="font-size:12px">Magnitudo</div><p style="margin-bottom:8px">${E(d.mag)}</p>` : ''}
   <div class="muted" style="font-size:12px">Koordinat</div><p style="margin-bottom:12px">${d.lat.toFixed(4)}°, ${d.lng.toFixed(4)}°</p>
   ${safe ? `<a class="btn ghost block" href="${E(d.link)}" target="_blank" rel="noopener">Detail di NASA EONET</a>` : ''}`;
  $('gd').scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

/* ---------- modal, share, struk ---------- */
function openModal(h, onclose) { $('mdc').innerHTML = h; $('md').classList.add('on'); $('md')._cb = onclose; $('mdc').querySelectorAll('[data-x]').forEach(b => b.onclick = closeModal) }
function closeModal() { $('md').classList.remove('on'); const cb = $('md')._cb; $('md')._cb = null; cb && cb() }
$('md').onclick = e => { if (e.target === $('md')) closeModal() };
function share(s, o) { // o = {t: teks, u: url, title}
  if (s === 'wa') open('https://wa.me/?text=' + encodeURIComponent(o.t + '\n' + o.u), '_blank');
  else if (s === 'fb') open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(o.u), '_blank');
  else if (s === 'cp') copy(o.u, 'Link disalin');
  else if (s === 'ig') { // Instagram tidak punya URL share untuk web: HP pakai menu share bawaan, desktop salin link lalu buka Instagram
    if (navigator.share) navigator.share({title: o.title, text: o.t, url: o.u}).catch(() => {});
    else { copy(o.u, 'Link disalin – tempel di Story/Bio/DM Instagram'); open('https://www.instagram.com/', '_blank') }
  }
}
function shareModal(o) {
  openModal(`<h2>Bagikan</h2><p class="muted" style="margin:4px 0 14px">${E(o.title)}</p><div class="grid g2"><button class="btn dark" data-s="wa">WhatsApp</button><button class="btn dark" data-s="ig">Instagram</button><button class="btn dark" data-s="fb">Facebook</button><button class="btn dark" data-s="cp">${I('copy', 14)} Salin Link</button></div>
   <input readonly value="${E(o.u)}" style="margin-top:12px;font-size:12px" onfocus="this.select()"><button class="btn ghost block" data-x style="margin-top:12px">Tutup</button>`);
  $('mdc').querySelectorAll('[data-s]').forEach(b => b.onclick = () => share(b.dataset.s, o));
}
const ref = d => d.ref || 'BTY-' + d.date.replace(/-/g, '') + '-' + String(d.id).toUpperCase().slice(0, 5);
function rows(d) {
  const c = DB.get('campaigns').find(x => x.id === d.camp);
  return [['No. Ref', ref(d)], ['Tanggal', d.date + (d.time ? ' ' + d.time : '')], ['Donatur', d.donor || user.name], ['Kampanye', c ? c.title : '-'], ['Metode', d.method], ['Status', d.status === 'paid' ? 'Berhasil' : 'Menunggu konfirmasi']];
}
function receiptModal(d, onclose) {
  openModal(`<div class="rcpt"><div style="text-align:center"><b style="font-size:16px">BANTUYUK</b><br>STRUK DONASI</div><hr>${rows(d).map(r => `<div class="r"><span>${E(r[0])}</span><span>${E(r[1])}</span></div>`).join('')}<hr>
   <div class="r"><b>TOTAL</b><b style="font-size:16px">${DB.rp(d.amount)}</b></div><hr><div style="text-align:center;font-size:12px">${d.status === 'paid' ? 'Terima kasih atas kebaikan Anda 🙏' : 'Donasi akan diverifikasi admin. Simpan struk ini sebagai bukti.'}</div></div>
   <div class="btns grid g2" style="margin-top:12px"><button class="btn" id="rdl">Unduh Struk (PNG)</button><button class="btn dark" id="rpr">Cetak</button></div><button class="btn ghost block btns" data-x style="margin-top:8px">Tutup</button>`, onclose);
  $('rdl').onclick = () => { const a = document.createElement('a'); a.href = receiptPNG(d); a.download = 'struk-' + ref(d) + '.png'; a.click() };
  $('rpr').onclick = () => print();
}
function receiptPNG(d) {
  const rs = rows(d), W = 420, pad = 24, cv = document.createElement('canvas'), x = cv.getContext('2d'); x.font = '14px monospace';
  const wrap = (t, max) => { const out = []; let l = ''; String(t).split(' ').forEach(s => { const n = l ? l + ' ' + s : s; if (x.measureText(n).width > max && l) { out.push(l); l = s } else l = n }); out.push(l); return out };
  const lines = []; rs.forEach(([k, v]) => wrap(v, W - pad * 2 - 110).forEach((ln, i) => lines.push([i ? '' : k, ln])));
  const H = pad * 2 + 70 + lines.length * 22 + 100; cv.width = W * 2; cv.height = H * 2; x.scale(2, 2);
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold 20px monospace'; x.fillText('BANTUYUK', W / 2, pad + 18); x.font = '12px monospace'; x.fillText('STRUK DONASI', W / 2, pad + 38);
  const dash = y => { x.strokeStyle = '#999'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(pad, y); x.lineTo(W - pad, y); x.stroke() }; dash(pad + 52);
  let y = pad + 78; x.font = '14px monospace';
  lines.forEach(([k, v]) => { x.textAlign = 'left'; x.fillText(k, pad, y); x.textAlign = 'left'; x.fillText(v, pad + 110, y); y += 22 });
  dash(y - 6); y += 20; x.font = 'bold 15px monospace'; x.textAlign = 'left'; x.fillText('TOTAL', pad, y); x.textAlign = 'right'; x.font = 'bold 18px monospace'; x.fillText(DB.rp(d.amount), W - pad, y);
  y += 16; dash(y); y += 24; x.textAlign = 'center'; x.font = '12px monospace'; x.fillText(d.status === 'paid' ? 'Terima kasih atas kebaikan Anda' : 'Menunggu verifikasi admin', W / 2, y);
  return cv.toDataURL('image/png');
}

/* ---------- donasi ---------- */
let donor = '';
function donasi() {
  $('t-donasi').innerHTML = I('heart') + ' Donasi';
  const cats = ['Semua', 'Bencana', 'Pendidikan', 'Kesehatan'];
  $('cc').innerHTML = cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}">${c}</button>`).join('');
  [...$('cc').children].forEach(b => b.onclick = () => { cat = b.textContent; donasi() });
  if (!selC) selC = DB.get('campaigns')[0]?.id;
  renderList(); renderDetail();
}
const link = id => location.href.split('#')[0] + '#donasi/' + id;
const campShare = c => ({title: c.title, t: `Ayo bantu: ${c.title} – ${c.loc}`, u: link(c.id)});
function renderList() {
  if (!$('cl')) return;
  const lv = c => c.level || 'Sedang', cs = DB.get('campaigns').filter(c => (cat === 'Semua' || c.cat === cat) && (c.title + c.loc).toLowerCase().includes(qtext));
  $('cl').innerHTML = cs.map(c => `<div class="camp2 ${c.id === selC ? 'on' : ''}" data-c="${c.id}"><img class="im" src="${E(c.img)}" alt="" onerror="this.style.visibility='hidden'"><div class="grow">
   <div class="t"><b>${E(c.title)}</b><span class="lv ${lv(c) === 'Kritis' ? 'k' : 's'}">Tingkat ${lv(c)}</span></div><div class="muted" style="font-size:12px;margin:2px 0 10px">${E(c.loc)}</div>
   <div class="bar thin"><i style="width:${Math.min(100, c.got / c.target * 100)}%"></i></div>
   <div class="row between" style="margin-top:6px"><span style="color:var(--cy);font-weight:700;font-size:12px">${DB.rp(c.got)} / ${DB.rp(c.target)}</span><span class="muted" style="font-size:12px">${c.days} hari lagi</span></div>
   <div class="row" style="margin-top:12px"><button class="btn sm" data-do="${c.id}">Donasi Sekarang</button><button class="btn dark sm" data-sh="${c.id}">${I('share', 14)} Bagikan Berita</button></div></div></div>`).join('') || '<div class="empty">Kampanye tidak ditemukan</div>';
  const pick = id => { selC = id; renderList(); renderDetail() };
  $('cl').querySelectorAll('.camp2').forEach(e => e.onclick = () => pick(e.dataset.c));
  $('cl').querySelectorAll('[data-do]').forEach(b => b.onclick = e => { e.stopPropagation(); pick(b.dataset.do); $('cd').scrollIntoView({behavior: 'smooth', block: 'start'}) });
  $('cl').querySelectorAll('[data-sh]').forEach(b => b.onclick = e => { e.stopPropagation(); shareModal(campShare(DB.get('campaigns').find(c => c.id === b.dataset.sh))) });
}
function renderDetail() {
  const c = DB.get('campaigns').find(x => x.id === selC); if (!c) { $('cd').innerHTML = '<div class="empty">Pilih kampanye</div>'; return }
  const acc = BC.PAY_ACCOUNTS;
  $('cd').innerHTML = `<div class="row" style="align-items:flex-start"><img class="thumb" src="${E(c.img)}" alt="" onerror="this.style.visibility='hidden'"><div class="grow"><h2>${E(c.title)}</h2><div class="muted" style="font-size:12px">Dikelola oleh ${E(c.org)}</div><span class="badge" style="margin-top:6px">${I('check', 12)} Terverifikasi</span></div></div>
  <p class="muted" style="margin:12px 0">${E(c.desc)}</p>
  <div class="row between"><b>${DB.rp(c.got)}</b><span class="muted">dari ${DB.rp(c.target)}</span></div><div class="bar" style="margin:6px 0"><i style="width:${Math.min(100, c.got / c.target * 100)}%"></i></div>
  <div class="muted" style="font-size:12px;margin-bottom:14px">${Math.round(c.got / c.target * 100)}% terkumpul · ${c.days} hari lagi</div>
  <h3 style="margin-bottom:8px">Nominal Donasi</h3><div class="row wrap" id="pre">${[25000, 50000, 100000, 250000].map(v => `<button class="chip ${v === amt ? 'on' : ''}" data-v="${v}">${DB.rp(v)}</button>`).join('')}</div>
  <input id="amt" type="number" min="1000" step="1000" value="${amt}" style="margin-top:8px">
  <label class="f">Nama donatur (opsional)</label><input id="dn" maxlength="60" value="${E(donor)}" placeholder="${user.guest ? 'Tamu / Hamba Allah' : E(user.name)}">
  <h3 style="margin:16px 0 8px">Metode Pembayaran</h3><div class="pay"><button data-p="qris" class="${pay === 'qris' ? 'on' : ''}">QRIS / DANA</button><button data-p="num" class="${pay === 'num' ? 'on' : ''}">Transfer ke Nomor / E-Wallet</button></div>
  <div id="pb" style="margin-top:14px">${pay === 'qris' ? `<div class="qrbox"><img src="${E(BC.QR_IMAGE)}" alt="QR pembayaran"></div><p class="muted" style="text-align:center;margin-top:8px;font-size:12px">Scan dengan DANA atau aplikasi QRIS favorit Anda</p>`
    : acc.map(a => `<div class="row card" style="padding:10px;margin-bottom:8px"><div class="grow"><b>${E(a.name)}</b><div>${E(a.number)} <span class="muted">${E(a.holder)}</span></div></div><button class="btn ghost sm" data-copy="${E(a.number)}">${I('copy', 14)} Salin</button></div>`).join('')}</div>
  <button class="btn block" id="paid" style="margin-top:12px">Saya Sudah Bayar</button>
  <button class="btn dark block" id="shd" style="margin-top:8px">${I('share', 14)} Bagikan Berita</button>`;
  $('pre').querySelectorAll('.chip').forEach(b => b.onclick = () => { donor = $('dn').value; amt = +b.dataset.v; renderDetail() });
  $('amt').oninput = e => amt = +e.target.value; $('dn').oninput = e => donor = e.target.value;
  $('cd').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pay = b.dataset.p; renderDetail() });
  $('cd').querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy, 'Nomor disalin'));
  $('shd').onclick = () => shareModal(campShare(c));
  $('paid').onclick = async () => {
    if (!(amt >= 1000)) return toast('Nominal tidak valid', 'Minimal Rp 1.000');
    if (API.on) {   // donasi dibuat berstatus 'pending'; 'paid' diset admin via /api/donations/confirm. Tamu: donor_id NULL.
      const btn = $('paid'); if (btn.disabled) return; btn.disabled = true;
      try {
        const d = await API.createDonation({campaignId: c.id, amount: amt, provider: pay === 'qris' ? 'qris_dana' : 'transfer_number', donorName: donor.trim()});
        DB.set('donations', [d, ...DB.get('donations').filter(x => x.id !== d.id)]); receiptModal(d, () => go('laporan'));
      } catch (er) { toast('Donasi gagal', er.message); const b = $('paid'); if (b) b.disabled = false }
      return;
    }
    const now = new Date(), d = {id: DB.uid(), date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), camp: c.id, method: pay === 'qris' ? 'QRIS / DANA' : 'Transfer Nomor / E-Wallet', amount: amt, status: 'pending', user: user.email, donor: donor.trim() || (user.guest ? 'Tamu' : user.name)};
    DB.set('donations', [d, ...DB.get('donations')]); receiptModal(d, () => go('laporan'));
  };
}
function copy(t, m) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => { const x = document.createElement('textarea'); x.value = t; document.body.append(x); x.select(); document.execCommand('copy'); x.remove() }).finally(() => toast(m)) }

/* ---------- laporan ---------- */
function laporan() {
  const cs = DB.get('campaigns'), mine = DB.get('donations').filter(d => d.user === user.email), tot = mine.filter(d => d.status === 'paid').reduce((a, d) => a + d.amount, 0);
  $('v-laporan').innerHTML = `<div class="title">${I('file')} Laporan Donasi</div>${user.guest ? '<div class="card muted" style="margin-bottom:14px;font-size:12px">Anda masuk sebagai tamu. Riwayat tersimpan di perangkat ini dan tetap muncul saat Anda masuk sebagai tamu lagi.</div>' : ''}
  <div class="grid g2"><div class="card stat"><span class="muted">Total donasi Anda (terkonfirmasi)</span><b>${DB.rp(tot)}</b></div>
  <div class="card"><h3>Transparansi Penyaluran Dana</h3>${['Dana terkumpul', 'Verifikasi dokumen', 'Pencairan dana', 'Penyaluran bantuan'].map(s => `<div class="row" style="padding:5px 0"><span class="badge ok">${I('check', 12)}</span>${s}</div>`).join('')}</div></div>
  <div class="card tw" style="margin-top:14px"><h2 style="margin-bottom:8px">Riwayat Donasi</h2><table><tr><th>Tanggal</th><th>Kampanye</th><th>Metode</th><th>Nominal</th><th>Status</th><th>Struk</th></tr>
  ${mine.map(d => `<tr><td>${d.date}</td><td>${E(cs.find(c => c.id === d.camp)?.title || '-')}</td><td>${E(d.method)}</td><td>${DB.rp(d.amount)}</td><td><span class="badge ${d.status === 'paid' ? 'ok' : 'warn'}">${d.status === 'paid' ? 'Berhasil' : 'Menunggu'}</span></td><td><button class="btn ghost sm" data-r="${d.id}">Lihat</button></td></tr>`).join('') || '<tr><td colspan=6 class="empty">Belum ada donasi</td></tr>'}</table></div>`;
  $('v-laporan').querySelectorAll('[data-r]').forEach(b => b.onclick = () => receiptModal(mine.find(d => d.id === b.dataset.r)));
}

/* ---------- relawan ---------- */
function relawan() {
  $('t-relawan').innerHTML = I('users') + ' Relawan';
  const rg = DB.get('regs'), mine = id => rg.some(r => r.vid === id && r.email === user.email);
  $('vl').innerHTML = DB.get('volunteers').map(v => `<div class="camp" data-v="${v.id}"><img src="${E(v.img)}" alt="" onerror="this.style.visibility='hidden'"><div class="grow"><b>${E(v.title)}</b><div class="muted" style="font-size:12px">${I('pin', 12)} ${E(v.loc)}<br>Jadwal: ${E(v.date)}</div>
   <div class="bar" style="margin:6px 0 4px"><i style="width:${v.taken / v.slots * 100}%"></i></div><div class="row between"><span class="muted" style="font-size:12px">${v.taken}/${v.slots} slot terisi</span>
   <button class="btn sm" data-r="${v.id}" ${mine(v.id) || v.taken >= v.slots ? 'disabled style="opacity:.6"' : ''}>${mine(v.id) ? 'Terdaftar ✓' : v.taken >= v.slots ? 'Penuh' : 'Daftar Relawan'}</button></div></div></div>`).join('') || '<div class="empty">Belum ada kegiatan</div>';
  $('vl').querySelectorAll('[data-r]').forEach(b => b.onclick = e => { e.stopPropagation(); join(b.dataset.r) });
  $('vl').querySelectorAll('.camp').forEach(e => e.onclick = () => { const v = DB.get('volunteers').find(x => x.id === e.dataset.v);
    $('vd').innerHTML = `<h2>${E(v.title)}</h2><span class="badge" style="margin:6px 0">${E(v.cat)}</span><p class="muted" style="margin:10px 0">${E(v.desc)}</p><div class="muted" style="font-size:12px">Lokasi</div><p>${E(v.loc)}</p><div class="muted" style="font-size:12px;margin-top:8px">Jadwal</div><p>${E(v.date)}</p><div class="muted" style="font-size:12px;margin-top:8px">Kuota</div><p>${v.taken}/${v.slots}</p>` });
}
async function join(id) {
  if (API.on) {
    if (user.guest) return toast('Perlu akun', 'Masuk dengan akun untuk mendaftar relawan');
    try {
      await API.call('/volunteers', {method: 'PUT', body: {eventId: id}, token: await API.token()});
      const v = DB.get('volunteers').find(x => x.id === id); await API.load.regs(); await API.load.volunteers(); toast('Pendaftaran berhasil', v ? v.title : '');
    } catch (er) { toast('Gagal mendaftar', er.message) }
    return;
  }
  const vs = DB.get('volunteers'), v = vs.find(x => x.id === id); if (!v || v.taken >= v.slots) return;
  v.taken++; DB.set('volunteers', vs); DB.set('regs', [...DB.get('regs'), {id: DB.uid(), vid: id, name: user.name, email: user.email, time: Date.now()}]);
  toast('Pendaftaran berhasil', v.title);
}

/* ---------- berita & pengaturan ---------- */
function berita() {
  $('v-berita').innerHTML = `<div class="title">${I('news')} Berita</div>` + (DB.get('news').map(n => `<div class="card" style="margin-bottom:12px"><span class="badge">${E(n.cat)}</span><h2 style="margin:8px 0">${E(n.title)}</h2><p class="muted" style="white-space:pre-line">${E(n.body)}</p><div class="row between" style="margin-top:10px"><span class="muted" style="font-size:11px">${DB.ago(n.time)}</span><button class="btn dark sm" data-n="${n.id}">${I('share', 14)} Bagikan Berita</button></div></div>`).join('') || '<div class="empty">Belum ada berita</div>');
  $('v-berita').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const n = DB.get('news').find(x => x.id === b.dataset.n); shareModal({title: n.title, t: n.title, u: location.href.split('#')[0] + '#berita'}) });
}
function pengaturan() {
  const sw = (k, l) => `<label class="row between" style="padding:8px 0"><span>${l}</span><input type="checkbox" data-s="${k}" ${S[k] ? 'checked' : ''} style="width:auto"></label>`;
  $('v-pengaturan').innerHTML = `<div class="title">${I('gear')} Pengaturan GIS</div><div class="card" style="max-width:480px"><label class="f">Tampilan peta</label><div class="row"><button class="chip ${S.dark ? 'on' : ''}" data-m="1">Mode Gelap</button><button class="chip ${S.dark ? '' : 'on'}" data-m="0">Mode Terang</button></div>
   ${sw('eonet', 'Kejadian bencana NASA EONET')}${sw('firms', 'Heatmap hotspot NASA FIRMS')}${sw('kampanye', 'Kampanye Donasi')}${sw('posko', 'Posko Bantuan')}${sw('cluster', 'Clustering marker')}${sw('legend', 'Tampilkan Legenda')}
   <label class="f">Zoom default</label><select id="zs">${[[5, '5 (Indonesia)'], [7, '7 (Pulau)'], [10, '10 (Kota)']].map(z => `<option value="${z[0]}" ${S.zoom == z[0] ? 'selected' : ''}>${z[1]}</option>`).join('')}</select></div>`;
  const sv = saveS;
  $('v-pengaturan').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.dark = +b.dataset.m; sv(); pengaturan() });
  $('v-pengaturan').querySelectorAll('[data-s]').forEach(i => i.onchange = () => { S[i.dataset.s] = i.checked; sv() });
  $('zs').onchange = e => { S.zoom = +e.target.value; sv(); if (map) map.setZoom(S.zoom) };
}
bellRender();
const m = location.hash.match(/^#donasi\/([\w-]+)/); if (m) { selC = m[1]; go('donasi') } else if (location.hash === '#berita') go('berita'); else go('dashboard');

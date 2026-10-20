// Data layer (demo: localStorage + sinkron antar tab/jendela via BroadcastChannel & storage event)
const DB = (() => {
  const P = 'bty_', ch = 'BroadcastChannel' in window ? new BroadcastChannel('bantuyuk') : null;
  const seed = {
    campaigns: [
      {id:'c1',level:'Kritis',title:'Bantuan Korban Banjir Deli Serdang',cat:'Bencana',loc:'Deli Serdang, Sumatera Utara',lat:3.5952,lng:98.6722,target:50000000,got:34000000,days:12,org:'Yayasan Peduli Negeri',img:'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400',desc:'Ribuan warga terdampak banjir setinggi 1,5 meter. Dana digunakan untuk makanan, air bersih, obat-obatan, dan tenda darurat.'},
      {id:'c2',level:'Sedang',title:'Pendidikan untuk Anak Terdampak Gempa',cat:'Pendidikan',loc:'Cianjur, Jawa Barat',lat:-6.8203,lng:107.1426,target:50000000,got:21000000,days:18,org:'Sahabat Pendidikan',img:'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',desc:'Perlengkapan sekolah dan sekolah darurat bagi anak-anak yang kehilangan ruang belajar.'},
      {id:'c3',level:'Sedang',title:'Bantuan Kesehatan Pasca Bencana',cat:'Kesehatan',loc:'Gunung Merapi, DIY',lat:-7.54,lng:110.44,target:50000000,got:37500000,days:7,org:'Relawan Sehat ID',img:'https://images.unsplash.com/photo-1584515933487-779824d29309?w=400',desc:'Obat-obatan, masker, dan layanan klinik keliling bagi pengungsi.'}
    ],
    disasters: [
      {id:'p1',name:'Posko Bantuan Medan',type:'Posko',level:'-',lat:3.5897,lng:98.6674,need:'Logistik & dapur umum',camp:null},
      {id:'p2',name:'Posko Bantuan Cianjur',type:'Posko',level:'-',lat:-6.78,lng:107.08,need:'Tenda & logistik',camp:null}
    ],
    volunteers: [
      {id:'v1',title:'Relawan Dapur Umum',cat:'Dapur Umum',loc:'Deli Serdang, Sumatera Utara',date:'15–20 Okt 2026',slots:20,taken:12,desc:'Membantu proses memasak dan pendistribusian makanan untuk korban banjir.',img:'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400'},
      {id:'v2',title:'Distribusi Logistik',cat:'Logistik',loc:'Medan, Sumatera Utara',date:'16–22 Okt 2026',slots:15,taken:8,desc:'Pengepakan dan pengantaran logistik ke posko pengungsian.',img:'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400'},
      {id:'v3',title:'Tim Edukasi Siaga Bencana',cat:'Edukasi',loc:'Sumatera Utara',date:'18–24 Okt 2026',slots:10,taken:6,desc:'Edukasi dan pendampingan psikososial untuk warga terdampak.',img:'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=400'}
    ],
    regs: [], news: [
      {id:'n1',title:'Banjir Deli Serdang: 2.300 warga mengungsi',body:'Tim gabungan terus mengevakuasi warga. Donasi dibuka untuk kebutuhan logistik darurat.',cat:'Bencana',time:Date.now()-864e5}
    ],
    notifs: [], donations: [
      {id:'t1',date:'2026-10-13',camp:'c1',method:'QRIS / DANA',amount:200000,status:'paid',user:'demo'},
      {id:'t2',date:'2026-10-10',camp:'c2',method:'Transfer Nomor',amount:150000,status:'paid',user:'demo'},
      {id:'t3',date:'2026-10-05',camp:'c3',method:'E-Wallet',amount:100000,status:'paid',user:'demo'},
      {id:'t4',date:'2026-09-16',camp:'c2',method:'QRIS / DANA',amount:150000,status:'pending',user:'demo'}
    ]
  };
  const API_ON = !!(window.BANTUYUK && window.BANTUYUK.API_BASE), mem = {}, LISTS = ['campaigns','disasters','volunteers','regs','news','notifs','donations'];
  const get = k => { if (API_ON) return mem[k] !== undefined ? mem[k] : (LISTS.includes(k) ? [] : null); try { const v = localStorage.getItem(P+k); if (v) return JSON.parse(v) } catch(e){} const s = JSON.parse(JSON.stringify(seed[k] ?? null)); if (s !== null) localStorage.setItem(P+k, JSON.stringify(s)); return s };
  const set = (k, v) => { if (API_ON) { mem[k] = v; window.dispatchEvent(new CustomEvent('bty-change',{detail:{k}})); return } localStorage.setItem(P+k, JSON.stringify(v)); ch && ch.postMessage({k}); window.dispatchEvent(new CustomEvent('bty-change',{detail:{k}})) };
  const on = fn => { ch && (ch.onmessage = e => fn(e.data.k)); window.addEventListener('storage', e => e.key && e.key.startsWith(P) && fn(e.key.slice(P.length))); window.addEventListener('bty-change', e => fn(e.detail.k)) };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const rp = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ago = t => { const m = Math.round((Date.now()-t)/6e4); return m<1?'baru saja':m<60?m+' mnt lalu':m<1440?Math.round(m/60)+' jam lalu':Math.round(m/1440)+' hari lalu' };
  // Tambah berita + notifikasi untuk semua user (1 operasi)
  const addNews = n => {
    const item = {id:uid(), time:Date.now(), ...n};
    set('news', [item, ...get('news')]);
    set('notifs', [{id:uid(), newsId:item.id, title:item.title, body:item.body.slice(0,120), time:item.time}, ...get('notifs')]);
    return item;
  };
  return {get,set,on,uid,rp,esc,ago,addNews};
})();
// Ikon inline (tanpa CDN) — gunakan I('nama')
const _i = {
 map:'<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15m6-12v15"/>',heart:'<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h8"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M17 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',news:'<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zM19 8h2v10a2 2 0 0 1-2 2M8 8h7M8 12h7M8 16h4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',trash:'<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',check:'<path d="m5 12 5 5L20 7"/>',pin:'<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'
};
const I = (n, s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_i[n]||''}</svg>`;

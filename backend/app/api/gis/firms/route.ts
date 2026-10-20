import { NextResponse } from 'next/server'

// Proxy NASA FIRMS (area API). API key hanya ada di server (FIRMS_MAP_KEY), tidak pernah dikirim ke browser.
// Limit FIRMS: 5000 transaksi / 10 menit → hasil di-cache 10 menit per kombinasi parameter.
const SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'MODIS_NRT']
const BBOX = /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/        // west,south,east,north
const TTL = 10 * 60 * 1000
const MAX_POINTS = 30000
const cache = new Map<string, { t: number; points: number[][] }>()

function weight(conf: string, frp: number) {
  const c = conf === 'h' ? 1 : conf === 'n' ? 0.6 : conf === 'l' ? 0.25 : Math.min(1, Math.max(0, Number(conf) / 100 || 0.5))
  return Number((c * 0.6 + Math.min(frp / 30, 1) * 0.4).toFixed(2))
}

export async function GET(request: Request) {
  const key = process.env.FIRMS_MAP_KEY
  if (!key) return NextResponse.json({ error: 'FIRMS_MAP_KEY belum diatur di server' }, { status: 500 })

  const sp = new URL(request.url).searchParams
  const source = sp.get('source') || 'VIIRS_SNPP_NRT'
  const days = Math.min(5, Math.max(1, parseInt(sp.get('days') || '1', 10) || 1))
  const bbox = sp.get('bbox') || '95,-11,141,6'          // default: Indonesia
  if (!SOURCES.includes(source) || !BBOX.test(bbox)) {
    return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 })
  }

  const ck = `${source}|${days}|${bbox}`
  const hit = cache.get(ck)
  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' }
  if (hit && Date.now() - hit.t < TTL) return NextResponse.json({ success: true, cached: true, count: hit.points.length, points: hit.points }, { headers })

  try {
    const res = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/${bbox}/${days}`, { signal: AbortSignal.timeout(20000) })
    const text = await res.text()
    if (!res.ok || !text.startsWith('latitude')) throw new Error(`FIRMS menolak permintaan (${res.status})`)

    const lines = text.trim().split('\n')
    const head = lines[0].split(',')
    const iLat = head.indexOf('latitude'), iLng = head.indexOf('longitude'), iFrp = head.indexOf('frp'), iConf = head.indexOf('confidence')
    const stride = Math.max(1, Math.ceil((lines.length - 1) / MAX_POINTS))
    const points: number[][] = []
    for (let i = 1; i < lines.length; i += stride) {
      const c = lines[i].split(',')
      const lat = Number(c[iLat]), lng = Number(c[iLng])
      if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([Number(lat.toFixed(3)), Number(lng.toFixed(3)), weight(c[iConf], Number(c[iFrp]) || 0)])
    }
    cache.set(ck, { t: Date.now(), points })
    return NextResponse.json({ success: true, cached: false, count: points.length, points }, { headers })
  } catch (err: any) {
    if (hit) return NextResponse.json({ success: true, stale: true, count: hit.points.length, points: hit.points }, { headers })
    return NextResponse.json({ error: err?.message || 'Gagal mengambil data FIRMS' }, { status: 502 })
  }
}

// Mengubah nilai kolom geography(Point,4326) dari PostgREST/Realtime menjadi {lat,lng}.
// Mendukung hex EWKB (default PostgREST), GeoJSON, dan WKT.
export function parseLocation(v: unknown): { lat: number; lng: number } | null {
  if (!v) return null
  if (typeof v === 'object') {
    const c = (v as { coordinates?: unknown }).coordinates
    return Array.isArray(c) && c.length >= 2 ? { lng: Number(c[0]), lat: Number(c[1]) } : null
  }
  if (typeof v !== 'string') return null
  const wkt = /POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(v)
  if (wkt) return { lng: Number(wkt[1]), lat: Number(wkt[2]) }
  if (/^[0-9a-f]{42,}$/i.test(v)) {
    const b = Buffer.from(v, 'hex'), le = b[0] === 1
    const type = le ? b.readUInt32LE(1) : b.readUInt32BE(1)
    const off = 5 + (type & 0x20000000 ? 4 : 0)            // lewati SRID bila ada
    const lng = le ? b.readDoubleLE(off) : b.readDoubleBE(off)
    const lat = le ? b.readDoubleLE(off + 8) : b.readDoubleBE(off + 8)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }
  return null
}

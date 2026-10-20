import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CORS untuk seluruh /api/*. Hanya domain frontend produksi yang diizinkan (bukan localhost, bukan '*').
// Bisa ditambah lewat env FRONTEND_ORIGIN (pisahkan koma), mis. domain custom.
const ALLOWED = (process.env.FRONTEND_ORIGIN || 'https://bantuyuk.vercel.app')
  .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowed = !!origin && ALLOWED.includes(origin)

  if (req.method === 'OPTIONS') {           // preflight
    return new NextResponse(null, { status: 204, headers: allowed ? corsHeaders(origin!) : { Vary: 'Origin' } })
  }
  const res = NextResponse.next()
  if (allowed) Object.entries(corsHeaders(origin!)).forEach(([k, v]) => res.headers.set(k, v))
  else res.headers.append('Vary', 'Origin')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  return res
}

export const config = { matcher: '/api/:path*' }

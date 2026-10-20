import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const confirmDonationSchema = z.object({ donationId: z.string().uuid() })

export const webhookSchema = z.object({
  paymentReference: z.string().min(5).max(100),
  status: z.literal('paid'),
})

// Payload donasi. Tanpa login (tamu): donor_id = NULL dan donasi dilacak lewat guestId acak dari browser.
export const createPaymentSchema = z.object({
  campaignId: z.string().uuid(),
  amount: z.coerce.number().int().min(1000).max(1_000_000_000),
  provider: z.enum(['qris_dana', 'transfer_number']).optional(),
  isAnonymous: z.boolean().optional(),
  donorName: z.string().trim().max(60).nullish(),
  donorMessage: z.string().trim().max(500).nullish(),
  guestId: z.string().regex(/^[A-Za-z0-9_-]{12,64}$/).nullish(),
})

export const createCampaignSchema = z.object({
  disasterReportId: z.string().uuid().nullish(),
  title: z.string().trim().min(3).max(150),
  slug: z.string().trim().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().min(3).max(5000),
  category: z.string().trim().min(2).max(40),
  targetAmount: z.coerce.number().positive().max(1e13),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  days: z.coerce.number().int().min(1).max(3650).optional(),
  status: z.enum(['draft', 'pending', 'active']).optional(),
  // opsional: bila diisi, dibuatkan laporan bencana terverifikasi sebagai lokasi kampanye
  locationName: z.string().trim().min(2).max(150).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  severity: z.enum(['low', 'medium', 'critical']).optional(),
})

export const createDisasterSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(3).max(5000),
  disasterType: z.enum(['flood', 'earthquake', 'landslide', 'wildfire', 'other']),
  severity: z.enum(['low', 'medium', 'critical']).optional(),
  locationName: z.string().trim().min(2).max(150),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap terlalu pendek").optional(),
  phone: z.string().min(10, "Nomor telepon tidak valid").optional(),
  avatarUrl: z.string().url("URL avatar tidak valid").optional(),
})
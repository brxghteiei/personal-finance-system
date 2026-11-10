import { z } from 'zod'

export const transactionInput = z.object({
  description: z.string().trim().min(1).max(80),
  amount: z.number().finite().positive().max(9999999999.99),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`)
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    }, 'วันที่ไม่ถูกต้อง'),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'เวลาไม่ถูกต้อง'),
  category: z.string().trim().min(1).max(80),
  type: z.enum(['income', 'expense']),
})

import { z } from 'zod'

export const emailSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim().toLowerCase() : value,
  z.string().min(1, 'กรุณากรอกอีเมล').max(254, 'อีเมลต้องไม่เกิน 254 ตัวอักษร').email('กรุณากรอกอีเมลให้ถูกต้อง'),
)

export const nameSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string().min(1, 'กรุณากรอกชื่อ').max(100, 'ชื่อต้องไม่เกิน 100 ตัวอักษร'),
)

export const passwordSchema = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(128, 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร')

export const loginIdentifierSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string()
    .min(1, 'กรุณากรอกชื่อผู้ใช้หรืออีเมล')
    .max(254, 'ชื่อผู้ใช้หรืออีเมลต้องไม่เกิน 254 ตัวอักษร')
    .refine((value) => {
      if (value.includes('@')) return z.string().max(254).email().safeParse(value).success
      return [...value].length <= 100
    }, 'กรุณากรอกชื่อผู้ใช้หรืออีเมลให้ถูกต้อง')
    .transform((value) => value.includes('@') ? value.toLowerCase() : value),
)

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(128, 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร'),
  rememberMe: z.boolean().default(false),
  captchaToken: z.string().optional(),
})

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { error: 'กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว' }),
}).superRefine(({ password, confirmPassword, email, name }, context) => {
  if (password !== confirmPassword) {
    context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' })
  }
  const normalizedPassword = password.normalize('NFKC').toLocaleLowerCase()
  const normalizedEmail = email.toLocaleLowerCase()
  const emailName = normalizedEmail.split('@')[0] ?? ''
  if (
    normalizedPassword === normalizedEmail ||
    normalizedPassword === name.toLocaleLowerCase() ||
    (emailName.length >= 4 && normalizedPassword.includes(emailName))
  ) {
    context.addIssue({ code: 'custom', path: ['password'], message: 'อย่าใช้ชื่อหรืออีเมลเป็นส่วนหนึ่งของรหัสผ่าน' })
  }
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resendVerificationSchema = z.object({ identifier: loginIdentifierSchema })

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).superRefine(({ password, confirmPassword }, context) => {
  if (password !== confirmPassword) {
    context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' })
  }
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

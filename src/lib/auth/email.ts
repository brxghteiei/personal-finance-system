import 'server-only'

import nodemailer from 'nodemailer'
import { appUrl } from './config'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

function mailTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const port = Number(process.env.SMTP_PORT)
  if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD are required')
  }
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password } })
}

function emailFrame(title: string, greeting: string, buttonText: string, url: string, expiry: string) {
  const safeTitle = escapeHtml(title)
  const safeGreeting = escapeHtml(greeting)
  const safeButton = escapeHtml(buttonText)
  const safeUrl = escapeHtml(url)
  const html = `<!doctype html><html lang="th"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#10243e"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:16px"><h1 style="font-size:22px">${safeTitle}</h1><p>${safeGreeting}</p><p><a href="${safeUrl}" style="display:inline-block;padding:14px 20px;background:#155eef;color:#fff;text-decoration:none;border-radius:8px">${safeButton}</a></p><p>หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p><p style="word-break:break-all"><a href="${safeUrl}">${safeUrl}</a></p><p>ลิงก์นี้หมดอายุใน ${escapeHtml(expiry)} และใช้ได้ครั้งเดียว</p><p>หากคุณไม่ได้ร้องขอ สามารถเพิกเฉยต่ออีเมลนี้ได้</p></main></body></html>`
  const text = `${title}\n\n${greeting}\n\n${buttonText}: ${url}\n\nลิงก์หมดอายุใน ${expiry} และใช้ได้ครั้งเดียว\nหากคุณไม่ได้ร้องขอ สามารถเพิกเฉยต่ออีเมลนี้ได้`
  return { html, text }
}

async function send(to: string, subject: string, content: { html: string; text: string }) {
  const from = process.env.MAIL_FROM
  if (!from) throw new Error('MAIL_FROM is required')
  await mailTransport().sendMail({ from, to, subject, ...content })
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = new URL('/verify-email', appUrl())
  url.searchParams.set('token', token)
  const content = emailFrame(
    'ยืนยันอีเมล Personal Finance',
    `สวัสดี ${name} โปรดยืนยันอีเมลเพื่อเปิดใช้งานบัญชี`,
    'ยืนยันอีเมล',
    url.toString(),
    '24 ชั่วโมง',
  )
  await send(to, 'ยืนยันอีเมลเพื่อเปิดใช้งาน Personal Finance', content)
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = new URL('/reset-password', appUrl())
  url.searchParams.set('token', token)
  const content = emailFrame(
    'ตั้งรหัสผ่าน Personal Finance ใหม่',
    `สวัสดี ${name} ใช้ลิงก์นี้เพื่อตั้งรหัสผ่านใหม่`,
    'ตั้งรหัสผ่านใหม่',
    url.toString(),
    '30 นาที',
  )
  await send(to, 'คำขอตั้งรหัสผ่าน Personal Finance ใหม่', content)
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  await send(to, 'รหัสผ่าน Personal Finance ถูกเปลี่ยนแล้ว', {
    html: `<p>สวัสดี ${escapeHtml(name)} รหัสผ่านบัญชี Personal Finance ของคุณถูกเปลี่ยนแล้ว ระบบได้ออกจากระบบทุกอุปกรณ์ หากคุณไม่ได้ดำเนินการนี้ โปรดติดต่อผู้ดูแลระบบทันที</p>`,
    text: `สวัสดี ${name} รหัสผ่านบัญชี Personal Finance ของคุณถูกเปลี่ยนแล้ว ระบบได้ออกจากระบบทุกอุปกรณ์ หากคุณไม่ได้ดำเนินการนี้ โปรดติดต่อผู้ดูแลระบบทันที`,
  })
}

export async function sendDuplicateRegistrationNotice(to: string, name: string) {
  await send(to, 'มีการพยายามสมัครบัญชี Personal Finance', {
    html: `<p>สวัสดี ${escapeHtml(name)} มีผู้พยายามสมัครด้วยอีเมลนี้ หากเป็นคุณ ให้เข้าสู่ระบบหรือรีเซ็ตรหัสผ่าน หากไม่ใช่คุณ สามารถเพิกเฉยต่ออีเมลนี้ได้ บัญชีของคุณยังปลอดภัย</p>`,
    text: `สวัสดี ${name} มีผู้พยายามสมัครด้วยอีเมลนี้ หากเป็นคุณ ให้เข้าสู่ระบบหรือรีเซ็ตรหัสผ่าน หากไม่ใช่คุณ สามารถเพิกเฉยต่ออีเมลนี้ได้ บัญชีของคุณยังปลอดภัย`,
  })
}

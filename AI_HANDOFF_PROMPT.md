# Prompt ส่งต่อให้ AI ทำงานกับระบบ Personal Finance System

คุณกำลังช่วยพัฒนาระบบ **Personal Finance System (Ledgerly)** ซึ่งเป็นเว็บจัดการการเงินส่วนบุคคลด้วย Next.js App Router, React, TypeScript, PostgreSQL, Prisma, Tailwind CSS, Zod และ Recharts

## บริบทโปรเจกต์

- Repository: `brxghteiei/personal-finance-system`
- โฟลเดอร์ทำงานปัจจุบัน: `C:\Users\inits\OneDrive\Documents\personal-finance-system`
- คุยและอธิบายงานกับผู้ใช้เป็นภาษาไทย
- ใช้ PowerShell และ path แบบ Windows เมื่อต้องสั่งงานในเครื่อง
- สถานะ branch และไฟล์เปลี่ยนแปลงเปลี่ยนได้เสมอ: ก่อนแก้ไขให้ตรวจ `git status --short --branch`, อ่านไฟล์จริง และดู diff ที่เกี่ยวข้อง ห้ามสมมติว่าสถานะใน prompt นี้ยังเป็นปัจจุบัน
- ณ snapshot ที่จัดทำเอกสารนี้ มีงาน Authentication หลายไฟล์ยังไม่ commit บน branch `Login_user`; ตรวจสถานะล่าสุดก่อนทำงาน และห้ามทับหรือย้อนการแก้ไขของผู้ใช้

## ภาพรวมระบบ

ระบบเป็นเว็บส่วนตัวที่ผู้ใช้ต้องเข้าสู่ระบบและยืนยันอีเมลก่อนใช้งานข้อมูลการเงิน ข้อมูลการเงินหลักถูกเก็บใน PostgreSQL ผ่าน Prisma และผูกกับเจ้าของข้อมูล (`ownerId`) ส่วนการตั้งค่าชื่อที่แสดงและสกุลเงินเก็บไว้ใน local storage ของ browser

```text
Browser
  -> Next.js Middleware (security headers, route guard เบื้องต้น)
  -> Root Layout (ตรวจ session จริงสำหรับหน้าที่ต้อง login)
  -> หน้าและ FinanceProvider (โหลดข้อมูลจาก API)
  -> API Route (ตรวจ session, origin สำหรับ mutation, validate input)
  -> Prisma
  -> PostgreSQL
```

ไฟล์หลักที่ควรเริ่มอ่าน:

- `src/middleware.ts` — route guard เบื้องต้นและ security headers
- `src/app/layout.tsx` — ตรวจผู้ใช้และครอบ finance pages ด้วย provider
- `src/components/finance/finance-provider.tsx` — โหลด/เก็บ client state และเรียก API
- `src/lib/auth/` — session, validation, security, rate limit, email และ CAPTCHA
- `src/app/api/` — API สำหรับ auth และข้อมูลการเงิน
- `prisma/schema.prisma` และ `prisma/migrations/` — schema และประวัติเปลี่ยนฐานข้อมูล
- `AUTHENTICATION.md` — รายละเอียดการตั้งค่าและ checklist ด้าน auth

## Flow การเข้าใช้งานและ Authentication

### การเปิดหน้า

1. Middleware เพิ่ม security headers ทุก request และตรวจว่ามี cookie ชื่อ `ledgerly_session` หรือไม่
2. ถ้าไม่มี cookie และเปิดหน้าที่ต้อง login จะ redirect ไป `/login`; API ที่ต้อง login จะตอบ `401`
3. Root layout ตรวจ session กับฐานข้อมูลผ่าน `getCurrentUser()` อีกครั้ง ไม่เชื่อ cookie เพียงอย่างเดียว
4. หน้าสาธารณะด้าน auth ได้แก่ `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy` และไม่ถูกครอบด้วย FinanceProvider
5. หน้าการเงินที่เหลือต้องมี session ที่ใช้งานได้และผู้ใช้ยืนยันอีเมลแล้ว

### สมัครและยืนยันอีเมล

```text
/register
  -> POST /api/auth/register
  -> ตรวจ origin + schema + rate limit + ความปลอดภัยของรหัสผ่าน
  -> hash รหัสผ่านด้วย Argon2id และสร้างผู้ใช้/verification token
  -> ส่งลิงก์ยืนยันทางอีเมล
  -> /verify-email -> POST /api/auth/verify-email
  -> ยืนยันอีเมลสำเร็จ -> ผู้ใช้เข้าสู่ระบบได้
```

มี endpoint สำหรับส่งลิงก์ยืนยันซ้ำ (`/api/auth/resend-verification`) ด้วย รายละเอียด validation และข้อจำกัดให้ดูจากโค้ดใน `src/lib/auth/` และ `AUTHENTICATION.md` ก่อนแก้

### เข้าสู่ระบบและออกจากระบบ

```text
/login
  -> POST /api/auth/login
  -> ตรวจ origin + input + login throttle/CAPTCHA ตามสถานะ
  -> ตรวจรหัสผ่านและสถานะยืนยันอีเมล
  -> สร้าง session ในฐานข้อมูล เก็บ token hash และตั้ง HttpOnly cookie
  -> หน้า private เรียก getCurrentUser() เพื่อยืนยัน session

ปุ่มออกจากระบบ
  -> POST /api/auth/logout
  -> ลบ session ปัจจุบันและ cookie
  -> กลับไป /login
```

Session มีวันหมดอายุและ idle timeout; `remember me` เปลี่ยนระยะเวลาได้ ชื่อแสดงผลอาจซ้ำกันได้ หากชื่อไม่ชี้ไปยังบัญชีเดียวให้เข้าสู่ระบบด้วยอีเมล

### ลืม/เปลี่ยนรหัสผ่าน

```text
/forgot-password -> POST /api/auth/forgot-password -> ส่ง reset link หากบัญชีมีอยู่
/reset-password?token=... -> POST /api/auth/reset-password
  -> ตรวจ token/อายุ/การใช้ซ้ำ -> เปลี่ยน password hash -> เพิกถอน sessions ตาม implementation
```

ห้ามเปิดเผย token, cookie, secret, connection string หรือข้อมูลส่วนตัวจาก environment/logs ในคำตอบหรือ commit

## Flow ข้อมูลการเงิน

### โหลดข้อมูลเข้าแอป

เมื่อ FinanceProvider mount จะโหลดข้อมูลจาก:

- `GET /api/transactions` — รายการที่ยังไม่ถูกลบของผู้ใช้ปัจจุบัน
- `GET /api/transactions/deleted` — รายการที่ลบแบบ soft-delete
- `GET /api/categories` — หมวดหมู่เริ่มต้นรวมกับหมวดหมู่ของผู้ใช้ โดยไม่แสดงหมวดหมู่ที่ซ่อน
- `GET /api/budgets` — งบประมาณของผู้ใช้

ผลลัพธ์เก็บใน context ของ client เพื่อให้หน้าต่าง ๆ ใช้ร่วมกันได้ การโหลดล้มเหลวจะแสดง error alert; อย่าเปลี่ยนเป็นการกลืน error หรือแสดงข้อมูลสำเร็จปลอม ๆ

### รายการธุรกรรม

```text
เพิ่ม: ฟอร์ม -> POST /api/transactions -> validate -> ผูก owner/category -> บันทึก -> อัปเดต context
แก้ไข: ฟอร์ม -> PATCH /api/transactions/[id] -> ตรวจ owner -> บันทึก -> อัปเดต context
ลบ: DELETE /api/transactions/[id] -> ตั้ง deletedAt (ไม่ hard-delete) -> ย้ายไปรายการที่เพิ่งลบ
กู้คืน: POST /api/transactions/[id]/restore -> ล้าง deletedAt -> กลับรายการปกติ
```

การแก้ไข/ลบ/กู้คืนต้องจำกัดด้วย `ownerId` ฝั่ง server เสมอ ห้ามอาศัยการซ่อนปุ่มหรือการตรวจจาก client เพื่อป้องกันการเข้าถึงข้อมูลข้ามบัญชี

### หมวดหมู่และงบประมาณ

- หมวดหมู่เริ่มต้นกำหนดใน `src/lib/finance.ts`; ผู้ใช้เพิ่ม/เปลี่ยนชื่อ/ซ่อนได้ผ่าน `POST/PATCH/DELETE /api/categories`
- การซ่อนหมวดหมู่คือการตั้ง `isActive = false` ไม่ใช่การลบรายการธุรกรรมเดิม
- งบประมาณเพิ่มหรือแก้ไขผ่าน `POST /api/budgets`; ระบุหมวดหมู่และเดือน (`YYYY-MM`) และบันทึกต่อผู้ใช้
- API ทุกตัวต้องดึง user จาก session และกรองข้อมูลตามเจ้าของเสมอ

### เดือน วันที่ และสกุลเงิน

- ตัวเลือกเดือนใน toolbar เป็น state ฝั่ง client ที่แชร์ผ่าน FinanceProvider; dashboard ใช้กรองธุรกรรมและงบของเดือนนั้น
- รายการธุรกรรมเก็บวันที่เป็น date-only ใน UTC (`date`) และเวลาเป็นข้อความ `HH:mm` แยก field; เวลาปัจจุบัน/วันที่วันนี้อ้างเขตเวลา `Asia/Bangkok`
- รูปแบบภาษาหลักเป็น `th-TH-u-ca-gregory` เพื่อแสดงปี ค.ศ.
- Currency ที่เลือกใน Settings เก็บใน local storage และมีผลเฉพาะการ format ตัวเลข **ไม่ได้แปลงอัตราแลกเปลี่ยน**

## หน้าหลักและเส้นทาง

| Path | หน้าที่ |
|---|---|
| `/` | ภาพรวมรายเดือน ยอดรับ/จ่าย/สุทธิ กราฟ สัดส่วนหมวดหมู่ รายการ และงบ |
| `/transactions` | ดูและจัดการรายการธุรกรรม |
| `/recently-deleted` | ดู/แก้ไข/กู้คืนรายการที่ soft-delete |
| `/calendar` | ดูธุรกรรมตามวันในปฏิทิน |
| `/categories` | จัดการหมวดหมู่รายรับ/รายจ่าย |
| `/budgets` | จัดการงบประมาณ |
| `/reports` | รายงานและสรุปข้อมูลการเงิน |
| `/settings` | ตั้งค่าชื่อแสดงผล สกุลเงิน และตัวเลือกที่ UI รองรับ |
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Flow บัญชีผู้ใช้ |
| `/terms`, `/privacy` | ข้อกำหนดและนโยบายความเป็นส่วนตัว |

หน้าแต่ละ path ส่วนใหญ่เป็น wrapper ที่ render component ใน `src/components/finance/`; ควรแก้ component และ API ที่เป็นเจ้าของพฤติกรรมจริง แทนการทำ logic ซ้ำใน page wrapper

## โครงสร้างข้อมูลสำคัญ

- `User` — บัญชีผู้ใช้ ข้อมูลอีเมล/รหัสผ่าน และเวลา/version ที่ยอมรับข้อกำหนด
- `Session` — hash ของ session token, ผู้ใช้, idle/absolute expiry และ remember-me
- `EmailVerificationToken`, `PasswordResetToken`, `LoginAttempt` — flow ความปลอดภัยของบัญชี
- `Category` — หมวดหมู่รายรับ/รายจ่าย, active state และ owner
- `Transaction` — ชื่อ จำนวนเงิน ประเภท วันที่ เวลา หมายเหตุ หมวดหมู่ owner และ `deletedAt`
- `Budget` — หมวดหมู่ owner เดือน และวงเงิน

แถวการเงินเดิมที่ `ownerId IS NULL` จะไม่แสดงให้บัญชีใหม่ ห้ามผูกข้อมูลเหล่านั้นกับผู้ใช้คนแรกโดยอัตโนมัติ การย้าย/กู้คืนข้อมูลต้องมีขั้นตอนแยกที่ตรวจสอบสิทธิ์ได้

## แนวทางเมื่อรับงานจากผู้ใช้

1. ทำความเข้าใจคำขอและตรวจเส้นทางที่เกี่ยวข้องในโค้ดจริงก่อน โดยตาม flow ให้ครบตั้งแต่ UI -> provider/client state -> API -> validation/auth -> Prisma/schema
2. ตรวจ `git status --short --branch` และ diff ก่อนแก้; รักษางานที่ยังไม่ commit และอย่า reset/checkout/revert ไฟล์ของผู้ใช้
3. ทำการเปลี่ยนแปลงให้เล็กและครบทุก surface ที่เกี่ยวข้อง รักษารูปแบบ/ภาษา/UX ที่มีอยู่ และอัปเดตเอกสารที่เกี่ยวข้อง
4. สำหรับ API ที่เปลี่ยนข้อมูล ให้ตรวจ authentication, owner scoping, origin/CSRF protection, validation และ error status ทั้งหมด
5. สำหรับ schema ให้ตรวจ migration ที่มีอยู่และฐานข้อมูลเป้าหมายก่อน ห้ามแก้หรือ apply migration กับ production โดยไม่มีความจำเป็นและอนุญาตชัดเจน
6. ทดสอบคำขอโดยตรงด้วยคำสั่งที่ครอบคลุมการเปลี่ยนแปลง เช่น `npm run typecheck`, `npm run lint`, `npx prisma validate` หรือ tests ที่เกี่ยวข้อง; รายงานเฉพาะสิ่งที่รันจริง
7. ห้าม commit, push, deploy, เปลี่ยน cloud permission หรือบันทึก secrets/credentials เว้นแต่ผู้ใช้ร้องขอการกระทำนั้นชัดเจนและ scope ตรงกัน
8. สรุปเป็นภาษาไทย: เปลี่ยนอะไร, flow ที่ได้รับผล, ผลทดสอบ และข้อจำกัดที่ยังเหลือ ห้ามอ้างว่า deploy/production สำเร็จหากไม่ได้ตรวจ deployment และหน้า/API จริง

คำสั่งพื้นฐานจาก `package.json`:

```powershell
npm run dev
npm run typecheck
npm run lint
npx prisma validate
npx prisma migrate status
npm run db:seed
```

ตรวจ environment variable จาก `.env.example` เท่านั้นเมื่อจำเป็น และห้ามแสดงค่าจริงจาก `.env` หรือ environment ของบริการภายนอก

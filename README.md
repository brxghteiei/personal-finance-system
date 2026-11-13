# Personal Finance System

ระบบจัดการการเงินส่วนบุคคล สร้างด้วย Next.js 15 App Router, TypeScript, PostgreSQL, Prisma ORM, Tailwind CSS, Recharts และ Zod

## ต้องมี
- Node.js 20.9 ขึ้นไป
- Docker Desktop

## เริ่มต้นใช้งาน (Windows PowerShell หรือ CMD)

1. คัดลอก `.env.example` เป็น `.env`
   - PowerShell: `Copy-Item .env.example .env`
   - CMD: `copy .env.example .env`
2. ติดตั้งแพ็กเกจ: `npm install`
3. เปิด PostgreSQL: `docker compose up -d`
4. สร้าง Prisma Client: `npx prisma generate`
5. สร้างตารางฐานข้อมูล: `npx prisma migrate dev --name init`
6. เพิ่มหมวดหมู่เริ่มต้น: `npm run db:seed`
7. เปิดเว็บ: `npm run dev`
8. เข้า `http://localhost:3000`

เริ่มรัน
docker compose up -d
npm run dev

PostgreSQL ใช้พอร์ต `5434` ซึ่งตรงกับ `DATABASE_URL` ในไฟล์ `.env`

## โครงสร้างเริ่มต้น

```text
personal-finance-system/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/prisma.ts
│   ├── types/
│   └── validators/
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

## หมายเหตุ
- หมวดหมู่ที่เพิ่มจากหน้า “หมวดหมู่” จะบันทึกใน PostgreSQL และเลือกใช้ได้ในรายการธุรกรรมกับงบประมาณ
- หมวดหมู่สามารถเปลี่ยนชื่อหรือซ่อนได้ การซ่อนจะไม่นำหมวดหมู่ไปใช้กับรายการใหม่ แต่ยังเก็บรายการธุรกรรมและงบประมาณเดิมไว้
- เลือกเดือนและปีจากมุมขวาบนของหน้า “ภาพรวม” เพื่อกรองข้อมูลในทุกหน้า ส่วนวันที่ในปฏิทินเลือกได้จากปฏิทินโดยตรง
- รายการธุรกรรมรองรับทั้งวันย้อนหลังและอนาคต แก้ไขหรือลบได้ และกู้คืนหรือแก้ไขรายการที่ลบแล้วได้จากเมนู “รายการที่เพิ่งลบ”
- ชื่อที่แสดงและสกุลเงินที่เลือกจะบันทึกใน local storage ของเบราว์เซอร์เครื่องนั้น การเลือกสกุลเงินเปลี่ยนรูปแบบการแสดงผลเท่านั้น ไม่ได้แปลงอัตราแลกเปลี่ยน
- รายการธุรกรรมบันทึกวันที่และเวลาในเขตเวลาไทย และดูรายการตามวันได้ที่เมนู “ปฏิทิน”

## เวอร์ชันโค้ด
- ทำงานบน branch แยกสำหรับแต่ละฟีเจอร์ แล้ว merge เข้า `main` หลังตรวจสอบ
- สร้าง tag เช่น `v1.1.0` เพื่อบันทึกเวอร์ชันที่ต้องการย้อนกลับมาอ้างอิง
- หากต้องการย้อนการเปลี่ยนแปลงที่ push ไปแล้ว ให้ใช้ `git revert <commit>` เพื่อสร้าง commit ย้อนกลับ โดยไม่ลบประวัติ
- การอัป/ดาวน์เกรดแพ็กเกจทำผ่าน `package.json` และ `package-lock.json` แยกจากการย้อนเวอร์ชันของโค้ด
- เก็บ `.env` และ connection string ไว้เป็น environment variables ในเครื่องหรือใน Vercel เท่านั้น ห้าม commit ขึ้น GitHub

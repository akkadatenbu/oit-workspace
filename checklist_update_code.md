# Checklist: Deploy OIT WorkSpace บน Server

## ข้อมูล Server

| รายการ | ค่า |
|--------|-----|
| Path หลัก | `/var/www/app/oit-workspace/` |
| Backend | `/var/www/app/oit-workspace/backend/` |
| Frontend | `/var/www/app/oit-workspace/frontend/` |
| PM2 App Name | `oit-workspace` |
| PM2 Config | `/var/www/app/ecosystem.config.js` |
| Backend Port | `5525` |
| URL | `https://workspace.northbkk.ac.th` |

---

## กรณีที่ 1 — แก้ Code ทั่วไป (ไม่มีเปลี่ยน DB Schema)

```bash
cd /var/www/app/oit-workspace
git pull

# Backend
cd backend
npm install          # เฉพาะเมื่อมี package ใหม่
npm run build        # compile TypeScript → dist/
pm2 restart oit-workspace

# Frontend
cd ../frontend
npm install          # เฉพาะเมื่อมี package ใหม่
npm run build        # สร้างไฟล์ใน frontend/dist/
```

---

## กรณีที่ 2 — มีการเปลี่ยน DB Schema (แก้ schema.prisma)

```bash
cd /var/www/app/oit-workspace
git pull

# Backend — ต้องทำตามลำดับนี้เสมอ
cd backend
npm install
npx prisma db push       # sync schema → PostgreSQL (ต้องก่อน build)
npx prisma generate      # regenerate Prisma client types
npm run build            # compile TypeScript → dist/
pm2 restart oit-workspace

# Frontend
cd ../frontend
npm install
npm run build
```

---

## Script รวม (deploy.sh)

วางไฟล์ไว้ที่ `/var/www/app/oit-workspace/deploy.sh`

```bash
#!/bin/bash
echo "=== [1/4] Pulling latest code ==="
git pull

echo "=== [2/4] Backend: build ==="
cd backend
npm install
npx prisma generate
npm run build
pm2 restart oit-workspace

echo "=== [3/4] Frontend: build ==="
cd ../frontend
npm install
npm run build

echo "=== [4/4] Done! ==="
pm2 status
curl -s https://workspace.northbkk.ac.th/api/health
```

ใช้งาน:
```bash
chmod +x deploy.sh   # ครั้งแรกครั้งเดียว
./deploy.sh
```

---

## ตารางสรุป: ทำอะไรเมื่อไหร่

| สิ่งที่เปลี่ยน | คำสั่งที่ต้องรัน |
|--------------|----------------|
| แก้ `.ts` ใน backend | `npm run build` → `pm2 restart oit-workspace` |
| แก้ `.tsx` ใน frontend | `npm run build` (frontend) |
| แก้ `schema.prisma` | `prisma db push` → `prisma generate` → `npm run build` → `pm2 restart` |
| เพิ่ม npm package | `npm install` ก่อน build เสมอ |
| แก้ `.env` | `pm2 restart oit-workspace` เท่านั้น |
| แก้ Nginx config | `sudo nginx -t` → `sudo systemctl reload nginx` |

---

## ตรวจสอบหลัง Deploy

```bash
# ดูสถานะ backend
pm2 status
pm2 logs oit-workspace --lines 30

# ทดสอบ API
curl https://workspace.northbkk.ac.th/api/health
# ผลที่ถูกต้อง: {"status":"ok","message":"OIT WorkSpace API is running"}
```

---

## ข้อควรจำ

> **`prisma db push` ต้องทำก่อน `npm run build` เสมอ**
> ถ้าทำหลัง TypeScript จะ compile fail เพราะ types ไม่ตรงกับ DB

> **Frontend ไม่ต้อง restart Nginx**
> Nginx ชี้ไปที่ `frontend/dist/` อัตโนมัติ แค่ `npm run build` ใหม่ก็พอ

> **ถ้า backend crash หลัง restart**
> รัน `pm2 logs oit-workspace` เพื่อดู error ก่อนแก้ไข

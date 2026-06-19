#!/bin/bash
# deploy.sh — /var/www/app/oit-workspace/

set -e  # หยุดทันทีถ้า command ไหน fail

echo "=== [1/4] Pulling latest code ==="
git pull

echo "=== [2/4] Backend: install + prisma + build ==="
cd backend
npm install
npx prisma db push     # sync schema → DB (ต้องก่อน generate และ build)
npx prisma generate    # regenerate Prisma client types
npm run build          # compile TypeScript → dist/
pm2 restart oit-workspace

echo "=== [3/4] Frontend: install + build ==="
cd ../frontend
npm install
npm run build          # สร้างไฟล์ใน frontend/dist/ (Nginx serve อัตโนมัติ)

echo "=== [4/4] Done! ==="
pm2 status
curl -s https://workspace.northbkk.ac.th/api/health

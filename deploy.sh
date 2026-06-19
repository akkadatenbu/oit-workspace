#!/bin/bash
# deploy.sh — วางไว้ที่ /var/www/app/oit-workspace/

echo "=== Pulling latest code ==="
git pull

echo "=== Backend: install + build ==="
cd backend
npm install
npx prisma generate
npm run build
pm2 restart oit-workspace

echo "=== Frontend: install + build ==="
cd ../frontend
npm install
npm run build

echo "=== Done! ==="
pm2 status

#ใช้งาน:
# chmod +x deploy.sh
# ./deploy.sh
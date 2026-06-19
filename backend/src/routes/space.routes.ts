import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Middleware ตรวจสอบการ Login
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

// ดึงข้อมูล Space ทั้งหมดพร้อม Project ด้านใน
router.get('/', isAuthenticated, async (req, res) => {
  const spaces = await prisma.space.findMany({
    include: { 
      folders: { include: { projects: true } },
      projects: { where: { folderId: null } }
    }
  });
  res.json(spaces);
});

// สร้าง Space ใหม่
router.post('/', isAuthenticated, async (req, res) => {
  const { name, description } = req.body;
  const space = await prisma.space.create({
    data: { name, description }
  });
  res.json(space);
});

// เปลี่ยนชื่อ Space
router.patch('/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const space = await prisma.space.update({
    where: { id: Number(id) },
    data: { ...(name !== undefined && { name }), ...(description !== undefined && { description }) }
  });
  res.json(space);
});

// ลบ Space (cascade ลบ folders และ projects ด้วย)
router.delete('/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  await prisma.space.delete({ where: { id: Number(id) } });
  res.json({ success: true });
});

export default router;

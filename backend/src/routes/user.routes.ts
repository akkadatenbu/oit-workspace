import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes'; // reusing the middleware for auth check

const router = Router();

// ดึงข้อมูลผู้ใช้ทั้งหมดในระบบ
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;

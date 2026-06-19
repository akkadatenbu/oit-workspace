import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes'; // reusing the middleware for auth check

const router = Router();

// ดึงข้อมูลผู้ใช้
// ?memberOnly=true → เฉพาะ user ที่ได้รับ invitation และ accept แล้ว (มีใน SpaceMember หรือ ProjectMember)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const memberOnly = req.query.memberOnly === 'true';

    const where = memberOnly
      ? {
          OR: [
            { spaceMemberships: { some: {} } },
            { projects:         { some: {} } }
          ]
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, displayName: true, email: true, avatarUrl: true },
      orderBy: { displayName: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;

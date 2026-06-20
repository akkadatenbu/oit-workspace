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

// บันทึก AI settings ของตัวเอง
router.patch('/me/settings', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const { groqApiKey, openrouterApiKey, aiProvider } = req.body;
  try {
    const data: Record<string, any> = {};
    if (groqApiKey       !== undefined) data.groqApiKey       = groqApiKey?.trim() || null;
    if (openrouterApiKey !== undefined) data.openrouterApiKey = openrouterApiKey?.trim() || null;
    if (aiProvider       !== undefined) data.aiProvider       = aiProvider || 'groq';

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, aiProvider: true, groqApiKey: true, openrouterApiKey: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;

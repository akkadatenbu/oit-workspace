import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

const userIsAdmin = (req: any) => (req.user as any)?.systemRole === 'Admin';

// ดึง Space ที่ user มีสิทธิ์เข้าถึง
router.get('/', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    // หา spaceId ที่ user เป็น member ของ project ใน space นั้น
    const memberSpaceIds = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      select: { spaceId: true }
    });
    const memberSpaceIdList = memberSpaceIds.map(p => p.spaceId);

    const whereClause = userIsAdmin(req)
      ? {}
      : {
          OR: [
            { ownerId: userId },       // เจ้าของ space
            { ownerId: null },         // space เก่าก่อน migration (ยังให้เข้าได้)
            { id: { in: memberSpaceIdList } } // ถูก invite ใน project
          ]
        };

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: {
        folders: { include: { projects: true } },
        projects: { where: { folderId: null } }
      }
    });
    res.json(spaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch spaces' });
  }
});

// สร้าง Space ใหม่ — set ownerId
router.post('/', isAuthenticated, async (req, res) => {
  const { name, description } = req.body;
  try {
    const space = await prisma.space.create({
      data: { name, description, ownerId: (req.user as any).id }
    });
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create space' });
  }
});

// เปลี่ยนชื่อ Space — เฉพาะเจ้าของหรือ Admin
router.patch('/:id', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    const space = await prisma.space.findUnique({ where: { id: Number(req.params.id) } });
    if (!space) return res.status(404).json({ error: 'Space not found' });
    if (!userIsAdmin(req) && space.ownerId !== null && space.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, description } = req.body;
    const updated = await prisma.space.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description })
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update space' });
  }
});

// ลบ Space — เฉพาะเจ้าของหรือ Admin
router.delete('/:id', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    const space = await prisma.space.findUnique({ where: { id: Number(req.params.id) } });
    if (!space) return res.status(404).json({ error: 'Space not found' });
    if (!userIsAdmin(req) && space.ownerId !== null && space.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await prisma.space.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete space' });
  }
});

export default router;

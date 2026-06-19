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
    // รวม spaceId จาก: ProjectMember + SpaceMember
    const [projectSpaces, spaceTeams] = await Promise.all([
      prisma.project.findMany({ where: { members: { some: { userId } } }, select: { spaceId: true } }),
      prisma.spaceMember.findMany({ where: { userId }, select: { spaceId: true } })
    ]);
    const accessibleSpaceIds = [
      ...projectSpaces.map(p => p.spaceId),
      ...spaceTeams.map(m => m.spaceId)
    ];

    const whereClause = userIsAdmin(req)
      ? {}
      : {
          OR: [
            { ownerId: userId },
            { ownerId: null },
            { id: { in: accessibleSpaceIds } }
          ]
        };

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: {
        folders: { include: { projects: true } },
        projects: { where: { folderId: null } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, email: true, avatarUrl: true } }
          }
        }
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

// ── Space Team Management ─────────────────────────────────────

// เพิ่มสมาชิกเข้าทีม Space + auto-add เป็น ProjectMember ทุก project ใน Space
router.post('/:id/members', isAuthenticated, async (req, res) => {
  const spaceId = Number(req.params.id);
  const currentUserId = (req.user as any).id;
  const { userId, role = 'Member' } = req.body;

  try {
    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) return res.status(404).json({ error: 'Space not found' });
    if (!userIsAdmin(req) && space.ownerId !== null && space.ownerId !== currentUserId) {
      return res.status(403).json({ error: 'Only space owner can manage team' });
    }

    // เพิ่มเป็น SpaceMember (upsert กันซ้ำ)
    const member = await prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId, userId: Number(userId) } },
      update: { role },
      create: { spaceId, userId: Number(userId), role: role as any },
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } }
    });

    // Auto-add เป็น ProjectMember ทุก project ใน Space
    const projects = await prisma.project.findMany({ where: { spaceId }, select: { id: true } });
    await Promise.all(projects.map(p =>
      prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: p.id, userId: Number(userId) } },
        update: { role: role as any },
        create: { projectId: p.id, userId: Number(userId), role: role as any }
      })
    ));

    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// ลบสมาชิกออกจากทีม Space + ลบออกจาก ProjectMember ทุก project ใน Space
router.delete('/:id/members/:userId', isAuthenticated, async (req, res) => {
  const spaceId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const currentUserId = (req.user as any).id;

  try {
    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) return res.status(404).json({ error: 'Space not found' });
    if (!userIsAdmin(req) && space.ownerId !== null && space.ownerId !== currentUserId) {
      return res.status(403).json({ error: 'Only space owner can manage team' });
    }

    // ลบ SpaceMember
    await prisma.spaceMember.delete({
      where: { spaceId_userId: { spaceId, userId: targetUserId } }
    });

    // ลบ ProjectMember ทุก project ใน Space (เฉพาะที่ role ไม่ใช่ Owner)
    const projects = await prisma.project.findMany({ where: { spaceId }, select: { id: true } });
    await Promise.all(projects.map(p =>
      prisma.projectMember.deleteMany({
        where: {
          projectId: p.id,
          userId: targetUserId,
          role: { not: 'Owner' }
        }
      })
    ));

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

export default router;

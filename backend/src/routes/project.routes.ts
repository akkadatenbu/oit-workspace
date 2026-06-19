import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

const userIsAdmin = (req: any) => (req.user as any)?.systemRole === 'Admin';

// ตรวจสอบสิทธิ์เข้าถึง project
async function canAccessProject(projectId: number, userId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { space: true, members: true }
  });
  if (!project) return false;
  const isSpaceOwner = project.space.ownerId === null || project.space.ownerId === userId;
  const isMember = project.members.some(m => m.userId === userId);
  return isSpaceOwner || isMember;
}

// ดึงข้อมูล Project พร้อม access check
router.get('/:id', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        space: true,
        tasks: {
          include: {
            assignees: { include: { user: true } },
            subTasks: true,
            attachments: true,
            links: true,
            comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
          }
        },
        members: { include: { user: true } }
      }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isSpaceOwner = project.space.ownerId === null || project.space.ownerId === userId;
    const isMember = project.members.some(m => m.userId === userId);
    if (!userIsAdmin(req) && !isSpaceOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// สร้าง Project ใหม่ — auto-add creator เป็น Owner
router.post('/', isAuthenticated, async (req, res) => {
  const { spaceId, folderId, name, description } = req.body;
  const userId = (req.user as any).id;
  try {
    const project = await prisma.project.create({
      data: {
        spaceId: Number(spaceId),
        folderId: folderId ? Number(folderId) : null,
        name,
        description
      }
    });
    // auto-add creator as Owner
    await prisma.projectMember.create({
      data: { projectId: project.id, userId, role: 'Owner' }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// อัปเดต Project — เฉพาะ space owner หรือ project owner หรือ Admin
router.patch('/:id', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    if (!await canAccessProject(Number(req.params.id), userId, userIsAdmin(req))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, folderId, status } = req.body;
    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: {
        name:     name     !== undefined ? name     : undefined,
        folderId: folderId !== undefined ? (folderId === null ? null : Number(folderId)) : undefined,
        status:   status   !== undefined ? status   : undefined
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ลบ Project
router.delete('/:id', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    if (!await canAccessProject(Number(req.params.id), userId, userIsAdmin(req))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ── Project Member Management ─────────────────────────────────

// ดึง member list
router.get('/:id/members', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    if (!await canAccessProject(Number(req.params.id), userId, userIsAdmin(req))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const members = await prisma.projectMember.findMany({
      where: { projectId: Number(req.params.id) },
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true, systemRole: true } } }
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// เพิ่ม member
router.post('/:id/members', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const { userId: targetUserId, role = 'Member' } = req.body;
  try {
    if (!await canAccessProject(Number(req.params.id), userId, userIsAdmin(req))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: Number(req.params.id), userId: Number(targetUserId) } },
      update: { role },
      create: { projectId: Number(req.params.id), userId: Number(targetUserId), role },
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } }
    });
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// ลบ member
router.delete('/:id/members/:userId', isAuthenticated, async (req, res) => {
  const currentUserId = (req.user as any).id;
  try {
    if (!await canAccessProject(Number(req.params.id), currentUserId, userIsAdmin(req))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: Number(req.params.id),
          userId: Number(req.params.userId)
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';
import { sendSystemActivationEmail } from '../utils/mailer';

const router = Router();

// Middleware: เฉพาะ Admin เท่านั้น
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  if ((req.user as any).systemRole !== 'Admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ── System Stats ─────────────────────────────────────────────
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalSpaces, totalProjects, totalTasks, completedTasks, pendingInvitations] =
      await Promise.all([
        prisma.user.count(),
        prisma.space.count(),
        prisma.project.count(),
        prisma.task.count({ where: { parentTaskId: null } }),
        prisma.task.count({ where: { parentTaskId: null, status: 'Done' } }),
        prisma.projectInvitation.count({ where: { status: 'Pending' } }),
      ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, displayName: true, avatarUrl: true, email: true, systemRole: true, createdAt: true }
    });

    res.json({
      totalUsers, totalSpaces, totalProjects, totalTasks, completedTasks, pendingInvitations,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// เชิญ user เข้าระบบ (system-level, ไม่เกี่ยวกับ Workspace ใด)
router.post('/invite-to-system', isAuthenticated, isAdmin, async (req, res) => {
  const { email } = req.body;
  const inviterName = (req.user as any).displayName || 'Admin';
  if (!email?.includes('@')) return res.status(400).json({ error: 'Invalid email address' });

  try {
    // ตรวจว่า user มีบัญชีและ active อยู่แล้วหรือยัง
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.isActive) {
      return res.status(409).json({ error: 'บัญชีนี้เปิดใช้งานอยู่แล้ว' });
    }

    // ยกเลิก pending system invite เดิม (ถ้ามี)
    await prisma.projectInvitation.deleteMany({
      where: { email, projectId: null, spaceId: null, status: 'Pending' }
    });

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // สร้าง system invite (projectId=null, spaceId=null)
    await prisma.projectInvitation.create({
      data: { email, token, role: 'Member', invitedById: (req.user as any).id, expiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await sendSystemActivationEmail({
      to: email, inviterName, confirmUrl: `${frontendUrl}/confirm-invitation/${token}`
    });

    res.json({ success: true, message: `ส่งลิงก์เปิดใช้งานไปที่ ${email} แล้ว` });
  } catch (error) {
    console.error('[invite-to-system]', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// ── User Management ──────────────────────────────────────────
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, canUploadFiles: true, department: true, createdAt: true,
        _count: {
          select: {
            createdTasks: true,
            projects: true,
            ownedSpaces: true
          }
        }
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Suspend / Activate user
router.patch('/users/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === (req.user as any).id) {
    return res.status(400).json({ error: 'Cannot suspend yourself' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, displayName: true, isActive: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// อัปเดต department/note
router.patch('/users/:id/department', isAuthenticated, isAdmin, async (req, res) => {
  const { department } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { department: department?.trim() || null },
      select: { id: true, department: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Toggle สิทธิ์แนบไฟล์
router.patch('/users/:id/upload-permission', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { canUploadFiles: !user.canUploadFiles },
      select: { id: true, email: true, displayName: true, canUploadFiles: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update upload permission' });
  }
});

// ลบ User ออกจากระบบ
router.delete('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  const adminId  = (req.user as any).id;

  if (targetId === adminId) {
    return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
  }
  try {
    // 1. Reassign tasks, links, attachments ที่สร้างโดย user นี้ ไปให้ admin
    await prisma.task.updateMany({ where: { createdById: targetId }, data: { createdById: adminId } });
    await prisma.taskLink.updateMany({ where: { createdById: targetId }, data: { createdById: adminId } });
    await prisma.taskAttachment.updateMany({ where: { uploadedById: targetId }, data: { uploadedById: adminId } });

    // 2. ลบ comments ของ user
    await prisma.taskComment.deleteMany({ where: { userId: targetId } });

    // 3. ลบ invitations ที่ user นี้ส่งออกไป
    await prisma.projectInvitation.deleteMany({ where: { invitedById: targetId } });

    // 4. ลบ user (cascade: ProjectMember, SpaceMember, TaskAssignee, Notification, Space.ownerId=SetNull)
    await prisma.user.delete({ where: { id: targetId } });

    res.json({ success: true });
  } catch (error) {
    console.error('[admin delete user]', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// เปลี่ยน role
router.patch('/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['Admin', 'Member', 'Guest'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  // ป้องกันตัวเองเปลี่ยน role ตัวเอง
  if (Number(req.params.id) === (req.user as any).id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { systemRole: role },
      select: { id: true, email: true, displayName: true, systemRole: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── Workspace Overview ───────────────────────────────────────
router.get('/spaces', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        _count: { select: { projects: true } }
      }
    });
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spaces' });
  }
});

// โอนความเป็นเจ้าของ space
router.patch('/spaces/:id/owner', isAuthenticated, isAdmin, async (req, res) => {
  const { ownerId } = req.body;
  try {
    const space = await prisma.space.update({
      where: { id: Number(req.params.id) },
      data: { ownerId: Number(ownerId) },
      include: { owner: { select: { displayName: true, email: true } } }
    });
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

export default router;

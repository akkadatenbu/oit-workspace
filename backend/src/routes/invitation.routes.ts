import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';
import { sendInvitationEmail } from '../utils/mailer';

const router = Router();

// ── Space-level invitation ────────────────────────────────────

// ส่งคำเชิญเข้า Workspace (Space)
router.post('/spaces/:id/invite', isAuthenticated, async (req, res) => {
  const spaceId = Number(req.params.id);
  const { email, role = 'Member' } = req.body;
  const invitedById = (req.user as any).id;
  const inviterName = (req.user as any).displayName || 'Someone';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { name: true } });
    if (!space) return res.status(404).json({ error: 'Space not found' });

    // ตรวจว่าเป็น SpaceMember อยู่แล้ว
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const already = await prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId: existingUser.id } }
      });
      if (already) return res.status(409).json({ error: 'User is already a member of this workspace' });
    }

    // ยกเลิก pending invitation เก่า
    await prisma.projectInvitation.deleteMany({
      where: { spaceId, email, status: 'Pending' }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.projectInvitation.create({
      data: { spaceId, email, token, role: role as any, invitedById, expiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await sendInvitationEmail({
      to: email,
      projectName: space.name,
      inviterName,
      role,
      confirmUrl: `${frontendUrl}/confirm-invitation/${token}`
    });

    res.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (error) {
    console.error('[space-invite]', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// ดึง pending invitations ของ Space
router.get('/spaces/:id/invitations', isAuthenticated, async (req, res) => {
  try {
    const invitations = await prisma.projectInvitation.findMany({
      where: { spaceId: Number(req.params.id), status: 'Pending' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// เปลี่ยน role ของ SpaceMember
router.patch('/spaces/:id/members/:userId/role', isAuthenticated, async (req, res) => {
  const spaceId = Number(req.params.id);
  const userId  = Number(req.params.userId);
  const { role } = req.body;
  if (!['Member', 'Guest'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const member = await prisma.spaceMember.update({
      where: { spaceId_userId: { spaceId, userId } },
      data: { role: role as any },
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } }
    });
    // sync role ใน projects ด้วย (ยกเว้น Owner)
    const projects = await prisma.project.findMany({ where: { spaceId }, select: { id: true } });
    await Promise.all(projects.map(p =>
      prisma.projectMember.updateMany({
        where: { projectId: p.id, userId, role: { not: 'Owner' } },
        data: { role: role as any }
      })
    ));
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── Project-level invitation ──────────────────────────────────

// ส่งคำเชิญเข้า Project
router.post('/projects/:id/invite', isAuthenticated, async (req, res) => {
  const projectId = Number(req.params.id);
  const { email, role = 'Member' } = req.body;
  const invitedById = (req.user as any).id;
  const inviterName = (req.user as any).displayName || 'Someone';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const already = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } }
      });
      if (already) return res.status(409).json({ error: 'User is already a member of this project' });
    }

    await prisma.projectInvitation.deleteMany({ where: { projectId, email, status: 'Pending' } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.projectInvitation.create({
      data: { projectId, email, token, role: role as any, invitedById, expiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await sendInvitationEmail({
      to: email, projectName: project.name, inviterName, role,
      confirmUrl: `${frontendUrl}/confirm-invitation/${token}`
    });

    res.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (error) {
    console.error('[project-invite]', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// ดึง pending invitations ของ Project
router.get('/projects/:id/invitations', isAuthenticated, async (req, res) => {
  try {
    const invitations = await prisma.projectInvitation.findMany({
      where: { projectId: Number(req.params.id), status: 'Pending' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// ── Shared: get detail + confirm + cancel ─────────────────────

// ดึงรายละเอียด invitation (ไม่ต้อง auth)
router.get('/invitations/:token', async (req, res) => {
  try {
    const inv = await prisma.projectInvitation.findUnique({
      where: { token: req.params.token },
      include: {
        project: { select: { id: true, name: true } },
        space:   { select: { id: true, name: true } },
        invitedBy: { select: { displayName: true, avatarUrl: true } }
      }
    });
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });
    if (inv.status !== 'Pending') return res.status(410).json({ error: 'Invitation already used or cancelled', status: inv.status });
    if (new Date() > inv.expiresAt) return res.status(410).json({ error: 'Invitation expired', status: 'Expired' });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

// ยืนยัน invitation
router.post('/invitations/:token/confirm', isAuthenticated, async (req, res) => {
  const userId    = (req.user as any).id;
  const userEmail = (req.user as any).email;

  try {
    const inv = await prisma.projectInvitation.findUnique({
      where: { token: req.params.token },
      include: {
        project: { select: { id: true, name: true } },
        space:   { select: { id: true, name: true } }
      }
    });

    if (!inv) return res.status(404).json({ error: 'Invitation not found' });
    if (inv.status !== 'Pending') return res.status(410).json({ error: 'Invitation already used or cancelled' });
    if (new Date() > inv.expiresAt) return res.status(410).json({ error: 'Invitation has expired' });
    if (inv.email.toLowerCase() !== userEmail.toLowerCase() && (req.user as any).systemRole !== 'Admin') {
      return res.status(403).json({ error: `This invitation was sent to ${inv.email}` });
    }

    // เปิดใช้งาน account ถ้ายังไม่ active (user ใหม่ที่เพิ่ง accept invitation)
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    if (inv.spaceId) {
      // Space-level invitation → add as SpaceMember + auto-add to all projects in space
      await prisma.spaceMember.upsert({
        where: { spaceId_userId: { spaceId: inv.spaceId, userId } },
        update: { role: inv.role },
        create: { spaceId: inv.spaceId, userId, role: inv.role }
      });
      const projects = await prisma.project.findMany({ where: { spaceId: inv.spaceId }, select: { id: true } });
      await Promise.all(projects.map(p =>
        prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: p.id, userId } },
          update: { role: inv.role },
          create: { projectId: p.id, userId, role: inv.role }
        })
      ));
      await prisma.projectInvitation.update({ where: { token: req.params.token }, data: { status: 'Accepted' } });
      return res.json({ success: true, spaceId: inv.spaceId, spaceName: inv.space?.name, type: 'space' });
    }

    if (inv.projectId) {
      // Project-level invitation → add as ProjectMember
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: inv.projectId, userId } },
        update: { role: inv.role },
        create: { projectId: inv.projectId, userId, role: inv.role }
      });
      await prisma.projectInvitation.update({ where: { token: req.params.token }, data: { status: 'Accepted' } });
      return res.json({ success: true, projectId: inv.projectId, projectName: inv.project?.name, type: 'project' });
    }

    // System-level invitation (projectId=null, spaceId=null) → just activate account
    await prisma.projectInvitation.update({ where: { token: req.params.token }, data: { status: 'Accepted' } });
    return res.json({ success: true, type: 'system', message: 'บัญชีของคุณถูกเปิดใช้งานแล้ว' });
  } catch (error) {
    console.error('[confirm]', error);
    res.status(500).json({ error: 'Failed to confirm invitation' });
  }
});

// ยกเลิก invitation
router.delete('/invitations/:id', isAuthenticated, async (req, res) => {
  try {
    await prisma.projectInvitation.update({
      where: { id: Number(req.params.id) },
      data: { status: 'Cancelled' }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

export default router;

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';
import { sendInvitationEmail } from '../utils/mailer';

const router = Router();

// ส่งคำเชิญ
router.post('/projects/:id/invite', isAuthenticated, async (req, res) => {
  const projectId = Number(req.params.id);
  const { email, role = 'Member' } = req.body;
  const invitedById = (req.user as any).id;
  const inviterName = (req.user as any).displayName || 'Someone';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // ตรวจว่าเป็น member อยู่แล้วไหม
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } }
      });
      if (alreadyMember) {
        return res.status(409).json({ error: 'User is already a member of this project' });
      }
    }

    // ยกเลิก invitation เก่า (ถ้ามี)
    await prisma.projectInvitation.deleteMany({
      where: { projectId, email, status: 'Pending' }
    });

    // สร้าง invitation ใหม่
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.projectInvitation.create({
      data: { projectId, email, token, role: role as any, invitedById, expiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const confirmUrl = `${frontendUrl}/confirm-invitation/${token}`;

    await sendInvitationEmail({
      to: email,
      projectName: project.name,
      inviterName,
      role,
      confirmUrl
    });

    res.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (error) {
    console.error('[invite]', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// ดึงรายการ pending invitations ของ project
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

// ดึงรายละเอียด invitation (สำหรับหน้า confirm — ไม่ต้อง auth)
router.get('/invitations/:token', async (req, res) => {
  try {
    const inv = await prisma.projectInvitation.findUnique({
      where: { token: req.params.token },
      include: {
        project: { select: { id: true, name: true } },
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

// ยืนยัน invitation (ต้อง login)
router.post('/invitations/:token/confirm', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const userEmail = (req.user as any).email;

  try {
    const inv = await prisma.projectInvitation.findUnique({
      where: { token: req.params.token },
      include: { project: { select: { id: true, name: true } } }
    });

    if (!inv) return res.status(404).json({ error: 'Invitation not found' });
    if (inv.status !== 'Pending') return res.status(410).json({ error: 'Invitation already used or cancelled' });
    if (new Date() > inv.expiresAt) return res.status(410).json({ error: 'Invitation has expired' });

    // อนุญาตให้ email ที่ถูก invite เท่านั้น หรือ Admin
    if (inv.email.toLowerCase() !== userEmail.toLowerCase() && (req.user as any).systemRole !== 'Admin') {
      return res.status(403).json({ error: `This invitation was sent to ${inv.email}` });
    }

    // เพิ่มเป็น member (upsert กันซ้ำ)
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: inv.projectId, userId } },
      update: { role: inv.role },
      create: { projectId: inv.projectId, userId, role: inv.role }
    });

    // Mark accepted
    await prisma.projectInvitation.update({
      where: { token: req.params.token },
      data: { status: 'Accepted' }
    });

    res.json({ success: true, projectId: inv.projectId, projectName: inv.project.name });
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

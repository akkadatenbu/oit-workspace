import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

// ดึง notifications ของ user
router.get('/', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        task: { select: { id: true, title: true, projectId: true } }
      }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// mark ทั้งหมดเป็นอ่านแล้ว
router.patch('/read-all', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// mark รายการเดียว
router.patch('/:id/read', isAuthenticated, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: Number(req.params.id) },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;

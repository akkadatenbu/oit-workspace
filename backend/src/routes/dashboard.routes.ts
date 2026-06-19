import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

router.get('/metrics', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const isAdmin = (req.user as any).systemRole === 'Admin';

  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Step 1: หา spaceId ที่ user เป็นเจ้าของ (รวม legacy null)
    const ownedSpaces = isAdmin
      ? await prisma.space.findMany({ select: { id: true } })
      : await prisma.space.findMany({
          where: { OR: [{ ownerId: userId }, { ownerId: null }] } as any,
          select: { id: true }
        });
    const ownedSpaceIds = ownedSpaces.map(s => s.id);

    // Step 2: หา projectId ที่ user เข้าถึงได้ (เจ้าของ space หรือ member)
    const accessibleProjects = await prisma.project.findMany({
      where: isAdmin ? {} : {
        OR: [
          { spaceId: { in: ownedSpaceIds } },
          { members: { some: { userId } } }
        ]
      },
      select: { id: true }
    });
    const projectIds = accessibleProjects.map(p => p.id);

    // Active Projects — โปรเจกต์ที่ user เข้าถึงได้และ status = Active
    const activeProjects = await prisma.project.count({
      where: {
        id: { in: projectIds },
        status: 'Active'
      }
    });

    // Tasks Due Soon — งานที่ user สร้างหรือถูก assign
    // ใน project ที่เข้าถึงได้, due ภายใน 7 วัน, ยังไม่ Done
    const tasksDueSoon = await prisma.task.count({
      where: {
        projectId: { in: projectIds },
        parentTaskId: null,
        status: { not: 'Done' },
        dueDate: { gte: now, lte: nextWeek },
        OR: [
          { createdById: userId },
          { assignees: { some: { userId } } }
        ]
      }
    });

    // Completed Tasks — งานที่ user สร้างหรือถูก assign และ Done แล้ว
    const completedTasks = await prisma.task.count({
      where: {
        projectId: { in: projectIds },
        parentTaskId: null,
        status: 'Done',
        OR: [
          { createdById: userId },
          { assignees: { some: { userId } } }
        ]
      }
    });

    res.json({ activeProjects, tasksDueSoon, completedTasks });
  } catch (error) {
    console.error('[dashboard/metrics]', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;

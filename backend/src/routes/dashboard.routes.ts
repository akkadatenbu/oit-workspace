import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

// helper: หา projectIds ที่ user เข้าถึงได้
async function getAccessibleProjectIds(userId: number, isAdmin: boolean): Promise<number[]> {
  if (isAdmin) {
    const all = await prisma.project.findMany({ select: { id: true } });
    return all.map(p => p.id);
  }
  const ownedSpaces = await prisma.space.findMany({
    where: { OR: [{ ownerId: userId }, { ownerId: null }] } as any,
    select: { id: true }
  });
  const ownedSpaceIds = ownedSpaces.map(s => s.id);
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { spaceId: { in: ownedSpaceIds } },
        { members: { some: { userId } } }
      ]
    },
    select: { id: true }
  });
  return projects.map(p => p.id);
}

// Metrics
router.get('/metrics', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const isAdmin = (req.user as any).systemRole === 'Admin';
  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const projectIds = await getAccessibleProjectIds(userId, isAdmin);

    const [activeProjects, tasksDueSoon, completedTasks] = await Promise.all([
      prisma.project.count({ where: { id: { in: projectIds }, status: 'Active' } }),
      prisma.task.count({
        where: {
          projectId: { in: projectIds }, parentTaskId: null,
          status: { not: 'Done' }, isArchived: false,
          dueDate: { gte: now, lte: nextWeek },
          OR: [{ createdById: userId }, { assignees: { some: { userId } } }]
        }
      }),
      prisma.task.count({
        where: {
          projectId: { in: projectIds }, parentTaskId: null, status: 'Done',
          OR: [{ createdById: userId }, { assignees: { some: { userId } } }]
        }
      }),
    ]);

    res.json({ activeProjects, tasksDueSoon, completedTasks });
  } catch (error) {
    console.error('[dashboard/metrics]', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Recent Activity — task อัปเดตล่าสุด 10 รายการ
router.get('/activity', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const isAdmin = (req.user as any).systemRole === 'Admin';
  try {
    const projectIds = await getAccessibleProjectIds(userId, isAdmin);
    const tasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds }, parentTaskId: null, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, status: true, updatedAt: true,
        project: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { displayName: true, avatarUrl: true } } } }
      }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Chart data — status distribution + งาน Done ย้อนหลัง 7 วัน
router.get('/chart', isAuthenticated, async (req, res) => {
  const userId = (req.user as any).id;
  const isAdmin = (req.user as any).systemRole === 'Admin';
  try {
    const projectIds = await getAccessibleProjectIds(userId, isAdmin);
    const baseWhere = { projectId: { in: projectIds }, parentTaskId: null, isArchived: false };

    // 1. Status distribution
    const statuses = ['ToDo', 'InProgress', 'Testing', 'Done'] as const;
    const statusCounts = await Promise.all(
      statuses.map(s => prisma.task.count({ where: { ...baseWhere, status: s } }))
    );
    const statusData = statuses.map((s, i) => ({ status: s, count: statusCounts[i] }));

    // 2. งาน Done ย้อนหลัง 7 วัน (by updatedAt)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const doneTasks = await prisma.task.findMany({
      where: { ...baseWhere, status: 'Done', updatedAt: { gte: sevenDaysAgo } },
      select: { updatedAt: true }
    });

    // group by date
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      byDay[d.toISOString().split('T')[0]] = 0;
    }
    doneTasks.forEach(t => {
      const key = t.updatedAt.toISOString().split('T')[0];
      if (key in byDay) byDay[key]++;
    });
    const trendData = Object.entries(byDay).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
      count
    }));

    res.json({ statusData, trendData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;

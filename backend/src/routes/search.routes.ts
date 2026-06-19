import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ tasks: [], projects: [] });

  const userId = (req.user as any).id;
  try {
    const [tasks, projects] = await Promise.all([
      prisma.task.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          parentTaskId: null,
          OR: [
            { createdById: userId },
            { assignees: { some: { userId } } }
          ]
        },
        select: { id: true, title: true, status: true, priority: true, projectId: true, project: { select: { name: true } } },
        take: 6,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.project.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, status: true },
        take: 4,
        orderBy: { name: 'asc' }
      })
    ]);
    res.json({ tasks, projects });
  } catch (error) {
    console.error('[search]', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;

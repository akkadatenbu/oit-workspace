import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

router.get('/metrics', isAuthenticated, async (req, res) => {
  try {
    const activeProjects = await prisma.project.count({
      where: { status: 'Active' }
    });
    
    // Tasks due within the next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const tasksDueSoon = await prisma.task.count({
      where: { 
        status: { not: 'Done' },
        dueDate: { not: null, lte: nextWeek }
      }
    });
    
    const completedTasks = await prisma.task.count({
      where: { status: 'Done' }
    });
    
    res.json({
      activeProjects,
      tasksDueSoon,
      completedTasks
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;

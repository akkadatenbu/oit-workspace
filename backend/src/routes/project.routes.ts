import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

// ดึงข้อมูล Project เดี่ยวๆ พร้อม Task ทั้งหมดในนั้น
router.get('/:id', isAuthenticated, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: Number(req.params.id) },
    include: {
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
  res.json(project);
});

// สร้าง Project ใหม่
router.post('/', isAuthenticated, async (req, res) => {
  const { spaceId, folderId, name, description } = req.body;
  const project = await prisma.project.create({
    data: { 
      spaceId: Number(spaceId), 
      folderId: folderId ? Number(folderId) : null,
      name, 
      description 
    }
  });
  res.json(project);
});

// อัปเดต Project (เช่น ย้าย Folder หรือเปลี่ยนชื่อ)
router.patch('/:id', isAuthenticated, async (req, res) => {
  const { name, folderId, status } = req.body;
  try {
    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: { 
        name: name !== undefined ? name : undefined,
        folderId: folderId !== undefined ? (folderId === null ? null : Number(folderId)) : undefined,
        status: status !== undefined ? status : undefined
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ลบ Project
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;

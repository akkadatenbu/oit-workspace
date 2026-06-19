import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';

const router = Router();

// สร้าง Folder ใหม่ใน Space
router.post('/', isAuthenticated, async (req, res) => {
  const { spaceId, name } = req.body;
  if (!spaceId || !name) {
    return res.status(400).json({ error: 'spaceId and name are required' });
  }

  try {
    // ตรวจสอบว่า Space มีอยู่จริงไหม และ user มีสิทธิ์เข้าถึง (Member)
    const space = await prisma.space.findUnique({
      where: { id: Number(spaceId) },
      include: {
        projects: {
          include: {
            members: true
          }
        }
      }
    });

    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    const folder = await prisma.folder.create({
      data: {
        spaceId: Number(spaceId),
        name
      },
      include: {
        projects: true
      }
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// แก้ไขชื่อ Folder
router.patch('/:id', isAuthenticated, async (req, res) => {
  const { name } = req.body;
  try {
    const folder = await prisma.folder.update({
      where: { id: Number(req.params.id) },
      data: { name },
      include: { projects: true }
    });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// ลบ Folder (โปรเจกต์ข้างในจะไม่ถูกลบ แต่จะกลายเป็น Standalone (folderId = null))
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    // Delete sets folderId to null due to SetNull in Prisma Schema
    await prisma.folder.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;

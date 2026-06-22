import { Router } from 'express';
import { prisma } from '../index';
import { isAuthenticated } from './space.routes';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// ตั้งค่า multer สำหรับบันทึกไฟล์อัปโหลด
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ดึงงานทั้งหมดของผู้ใช้ (ใช้ในหน้า My Tasks)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        parentTaskId: null,
        isArchived: false,
        OR: [
          { createdById: (req.user as any).id },
          { assignees: { some: { userId: (req.user as any).id } } }
        ]
      },
      include: {
        project: { include: { space: true } },
        subTasks: true,
        attachments: true,
        links: true,
        assignees: { include: { user: true } },
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user tasks' });
  }
});

// สร้าง Task ใหม่
router.post('/', isAuthenticated, async (req, res) => {
  const { projectId, title, description, status, priority, dueDate, parentTaskId, timeEstimate } = req.body;

  try {
    const task = await prisma.task.create({
      data: {
        projectId: Number(projectId),
        title,
        description,
        status: status || 'ToDo',
        priority: priority || 'Medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        timeEstimate: timeEstimate || null,
        parentTaskId: parentTaskId ? Number(parentTaskId) : null,
        createdById: (req.user as any).id,
      },
      include: {
        assignees: { include: { user: true } },
        subTasks: true,
        attachments: true,
        links: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// อัปเดต Status ของ Task (ใช้ตอนลากวาง Kanban Board)
router.patch('/:id/status', isAuthenticated, async (req, res) => {
  const { status } = req.body;
  try {
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { status }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// อัปเดต Task แบบเต็ม
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, description, priority, dueDate, status, timeEstimate, progressPercent } = req.body;

    const updateData: Record<string, any> = {};
    if (title           !== undefined) updateData.title           = title;
    if (description     !== undefined) updateData.description     = description;
    if (priority        !== undefined) updateData.priority        = priority;
    if (status          !== undefined) updateData.status          = status;
    if (dueDate         !== undefined) updateData.dueDate         = dueDate ? new Date(dueDate) : null;
    if (timeEstimate    !== undefined) updateData.timeEstimate    = timeEstimate || null;
    if (progressPercent !== undefined) updateData.progressPercent = Number(progressPercent);

    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        assignees: { include: { user: true } },
        subTasks: true,
        attachments: true,
        links: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
      }
    });
    res.json(task);
  } catch (error) {
    console.error('[PATCH /tasks/:id] error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// เรียงลำดับ Subtasks ใหม่
router.patch('/subtasks/reorder', isAuthenticated, async (req, res) => {
  const { order } = req.body; // array of subtask IDs in desired order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array' });
  try {
    await Promise.all(
      order.map((id: number, index: number) =>
        prisma.task.update({ where: { id: Number(id) }, data: { sortOrder: index } })
      )
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder subtasks' });
  }
});

// Archive / Unarchive Task
router.patch('/:id/archive', isAuthenticated, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: Number(req.params.id) },
      select: { isArchived: true }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const updated = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { isArchived: !task.isArchived },
      select: { id: true, isArchived: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive task' });
  }
});

// ลบ Task
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// เพิ่ม Assignee + สร้าง Notification
router.post('/:id/assignees', isAuthenticated, async (req, res) => {
  const { userId } = req.body;
  const currentUserId = (req.user as any).id;
  try {
    const assignee = await prisma.taskAssignee.create({
      data: { taskId: Number(req.params.id), userId: Number(userId) },
      include: { user: true }
    });

    // แจ้งเตือนผู้ถูก assign (ถ้าไม่ใช่ตัวเอง)
    if (Number(userId) !== currentUserId) {
      const task = await prisma.task.findUnique({
        where: { id: Number(req.params.id) },
        select: { title: true, project: { select: { name: true } } }
      });
      if (task) {
        const name = (req.user as any).displayName || 'Someone';
        await prisma.notification.create({
          data: {
            userId: Number(userId),
            taskId: Number(req.params.id),
            type: 'assigned',
            message: `${name} assigned you to "${task.title}" in ${task.project?.name || ''}`
          }
        });
      }
    }

    res.json(assignee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// ลบ Assignee
router.delete('/:id/assignees/:userId', isAuthenticated, async (req, res) => {
  try {
    await prisma.taskAssignee.delete({
      where: {
        taskId_userId: {
          taskId: Number(req.params.id),
          userId: Number(req.params.userId)
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove assignee' });
  }
});

// อัปโหลดไฟล์แนบ (Attachment)
router.post('/:id/attachments', isAuthenticated, upload.single('file'), async (req, res) => {
  const u = req.user as any;
  if (u.systemRole !== 'Admin' && !u.canUploadFiles) {
    if (req.file) require('fs').unlinkSync(req.file.path); // ลบไฟล์ที่ multer บันทึกไปแล้ว
    return res.status(403).json({ error: 'ไม่มีสิทธิ์แนบไฟล์ กรุณาติดต่อ Admin' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    // multer parses originalname as latin1 by default, causing Thai characters to break. We must convert it to utf8.
    const decodedFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: Number(req.params.id),
        fileName: decodedFileName,
        filePath: `/uploads/${req.file.filename}`,
        uploadedById: (req.user as any).id,
        source: 'Local'
      }
    });
    res.json(attachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// ลบไฟล์แนบ
router.delete('/attachments/:attachmentId', isAuthenticated, async (req, res) => {
  try {
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: Number(req.params.attachmentId) }
    });
    
    if (attachment && attachment.filePath) {
      const fullPath = path.join(__dirname, '../../', attachment.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    await prisma.taskAttachment.delete({
      where: { id: Number(req.params.attachmentId) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// เพิ่มลิงก์ (Link)
router.post('/:id/links', isAuthenticated, async (req, res) => {
  const { title, url } = req.body;
  try {
    const link = await prisma.taskLink.create({
      data: {
        taskId: Number(req.params.id),
        title,
        url,
        createdById: (req.user as any).id
      }
    });
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add link' });
  }
});

// ลบลิงก์
router.delete('/links/:linkId', isAuthenticated, async (req, res) => {
  try {
    await prisma.taskLink.delete({
      where: { id: Number(req.params.linkId) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// เพิ่ม Assignee
router.post('/:id/assignees', isAuthenticated, async (req, res) => {
  const { userId } = req.body;
  try {
    const assignee = await prisma.taskAssignee.create({
      data: {
        taskId: Number(req.params.id),
        userId: Number(userId)
      },
      include: { user: true }
    });
    res.json(assignee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// ลบ Assignee
router.delete('/:id/assignees/:userId', isAuthenticated, async (req, res) => {
  try {
    await prisma.taskAssignee.delete({
      where: {
        taskId_userId: {
          taskId: Number(req.params.id),
          userId: Number(req.params.userId)
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove assignee' });
  }
});

// เพิ่ม Comment + สร้าง Notifications
router.post('/:id/comments', isAuthenticated, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

  const currentUserId = (req.user as any).id;
  const commenterName  = (req.user as any).displayName || 'Someone';

  try {
    const comment = await prisma.taskComment.create({
      data: {
        taskId: Number(req.params.id),
        userId: currentUserId,
        text: text.trim()
      },
      include: { user: true }
    });

    // แจ้งเตือน creator + assignees (ยกเว้น commenter)
    const task = await prisma.task.findUnique({
      where: { id: Number(req.params.id) },
      select: { title: true, createdById: true, assignees: { select: { userId: true } } }
    });
    if (task) {
      const notifyIds = new Set<number>();
      if (task.createdById !== currentUserId) notifyIds.add(task.createdById);
      task.assignees.forEach(a => { if (a.userId !== currentUserId) notifyIds.add(a.userId); });
      for (const uid of notifyIds) {
        await prisma.notification.create({
          data: {
            userId: uid,
            taskId: Number(req.params.id),
            type: 'comment',
            message: `${commenterName} commented on "${task.title}"`
          }
        });
      }
    }

    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;

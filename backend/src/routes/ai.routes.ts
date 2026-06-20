import { Router } from 'express';
import { isAuthenticated } from './space.routes';

const router = Router();

const AI_PROVIDERS: Record<string, { url: string; model: string; extraHeaders?: Record<string, string> }> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    extraHeaders: {
      'HTTP-Referer': process.env.FRONTEND_URL || 'https://workspace.northbkk.ac.th',
      'X-Title': 'OIT WorkSpace',
    },
  },
};

router.post('/analyze', isAuthenticated, async (req, res) => {
  const { apiKey, tasks, provider = 'groq' } = req.body;

  const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.groq;

  if (!apiKey?.trim()) {
    return res.status(400).json({ error: `กรุณาใส่ API Key สำหรับ ${provider === 'openrouter' ? 'OpenRouter' : 'Groq'}` });
  }
  if (!tasks?.length) {
    return res.status(400).json({ error: 'ไม่มี task ที่จะวิเคราะห์' });
  }

  const now = new Date();

  // สรุปข้อมูล tasks สำหรับ prompt
  const summary = tasks.map((t: any) => ({
    ชื่องาน:         t.title,
    สถานะ:          t.status,
    ความสำคัญ:       t.priority,
    วันกำหนดส่ง:     t.dueDate ? new Date(t.dueDate).toLocaleDateString('th-TH') : 'ไม่ระบุ',
    เลยกำหนด:       t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done' ? 'ใช่' : 'ไม่',
    ความคืบหน้า:     `${t.progressPercent ?? 0}%`,
    เวลาประมาณ:     t.timeEstimate || 'ไม่ระบุ',
    ผู้รับผิดชอบ:    t.assignees?.map((a: any) => a.user?.displayName).filter(Boolean).join(', ') || 'ไม่ระบุ',
    โปรเจกต์:       t.project?.name || 'ไม่ระบุ',
  }));

  const overdue  = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done').length;
  const done     = tasks.filter((t: any) => t.status === 'Done').length;
  const inProg   = tasks.filter((t: any) => t.status === 'InProgress').length;
  const todo     = tasks.filter((t: any) => t.status === 'ToDo').length;
  const testing  = tasks.filter((t: any) => t.status === 'Testing').length;
  const urgent   = tasks.filter((t: any) => t.priority === 'Urgent').length;
  const high     = tasks.filter((t: any) => t.priority === 'High').length;

  const prompt = `คุณเป็น AI ผู้ช่วยจัดการโปรเจกต์และงานของทีม IT มหาวิทยาลัย

ข้อมูลสรุป task ทั้งหมด ${tasks.length} รายการ:
- เสร็จแล้ว (Done): ${done} รายการ
- กำลังทำ (In Progress): ${inProg} รายการ
- รอดำเนินการ (To Do): ${todo} รายการ
- กำลังทดสอบ (Testing): ${testing} รายการ
- เลยกำหนดส่ง: ${overdue} รายการ
- Urgent: ${urgent} | High: ${high} รายการ

รายละเอียด task:
${JSON.stringify(summary, null, 2)}

กรุณาวิเคราะห์และสรุปเป็นภาษาไทยในรูปแบบดังนี้:

## 📊 ภาพรวม
สรุปสั้นๆ เกี่ยวกับสถานะงานทั้งหมด

## ⚠️ งานเร่งด่วน
งานที่ต้องดูแลทันที (เลยกำหนด, Urgent, ค้างนาน)

## 📈 ความคืบหน้า
วิเคราะห์ความคืบหน้าโดยรวม

## 💡 ข้อเสนอแนะ
2-3 ข้อแนะนำที่ควรทำเพื่อปรับปรุงประสิทธิภาพงาน

ตอบให้กระชับ ชัดเจน และเป็นประโยชน์`;

  try {
    const response = await fetch(providerConfig.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        ...(providerConfig.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [
          { role: 'system', content: 'คุณเป็นผู้ช่วย AI สำหรับจัดการโปรเจกต์ ตอบเป็นภาษาไทยเสมอ' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json();
      return res.status(400).json({ error: err?.error?.message || 'Groq API error' });
    }

    const data: any = await response.json();
    res.json({ result: data.choices[0].message.content });
  } catch (error) {
    console.error('[ai/analyze]', error);
    res.status(500).json({ error: 'ไม่สามารถเชื่อมต่อ Groq API ได้' });
  }
});

export default router;

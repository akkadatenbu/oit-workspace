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

  // คำนวณข้อมูลเพิ่มเติมสำหรับการวิเคราะห์
  const thisWeekEnd = new Date(now);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
  const nextWeekEnd = new Date(now);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

  const dueSoon     = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= thisWeekEnd && t.status !== 'Done').length;
  const dueNextWeek = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) > thisWeekEnd && new Date(t.dueDate) <= nextWeekEnd && t.status !== 'Done').length;
  const noAssignee  = tasks.filter((t: any) => (!t.assignees || t.assignees.length === 0) && t.status !== 'Done').length;
  const noDueDate   = tasks.filter((t: any) => !t.dueDate && t.status !== 'Done').length;
  const noProgress  = tasks.filter((t: any) => t.status === 'InProgress' && (t.progressPercent ?? 0) === 0).length;
  const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((s: number, t: any) => s + (t.progressPercent ?? 0), 0) / tasks.length) : 0;
  const completionRate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  // workload per assignee
  const workload: Record<string, number> = {};
  tasks.forEach((t: any) => {
    t.assignees?.forEach((a: any) => {
      const name = a.user?.displayName || 'ไม่ระบุ';
      if (t.status !== 'Done') workload[name] = (workload[name] || 0) + 1;
    });
  });
  const workloadStr = Object.entries(workload)
    .sort(([,a],[,b]) => b - a)
    .map(([name, count]) => `${name}: ${count} งาน`)
    .join(', ') || 'ไม่มีข้อมูล';

  const prompt = `คุณเป็นที่ปรึกษาด้านการจัดการโปรเจกต์ระดับมืออาชีพ วิเคราะห์สถานการณ์งานของทีม IT มหาวิทยาลัยนี้อย่างละเอียด

=== สถิติภาพรวม ===
รวมทั้งหมด: ${tasks.length} รายการ | เสร็จ: ${done} (${completionRate}%) | กำลังทำ: ${inProg} | ทดสอบ: ${testing} | รอ: ${todo}
เลยกำหนดส่ง: ${overdue} | ครบกำหนดสัปดาห์นี้: ${dueSoon} | สัปดาห์หน้า: ${dueNextWeek}
Urgent: ${urgent} | High: ${high} | ความคืบหน้าเฉลี่ย: ${avgProgress}%
ไม่มีผู้รับผิดชอบ: ${noAssignee} | ไม่มีกำหนดส่ง: ${noDueDate} | In Progress แต่ 0%: ${noProgress}
ภาระงานรายคน (เฉพาะที่ยังค้าง): ${workloadStr}

=== รายละเอียด Task ===
${JSON.stringify(summary, null, 2)}

กรุณาวิเคราะห์อย่างละเอียดและเป็นภาษาไทยตามโครงสร้างนี้:

## 📊 สรุปภาพรวม
วิเคราะห์สถานะโดยรวมของทีม อัตราความสำเร็จ และแนวโน้ม 2-3 ประโยค

## 🚨 ความเสี่ยงและจุดวิกฤต
- รายการงานที่เลยกำหนดและผลกระทบ
- งานที่ยังไม่มีผู้รับผิดชอบ
- งาน In Progress ที่ไม่มีความคืบหน้า (ค้าง)
- ความเสี่ยงอื่นๆ ที่พบ

## ⏰ งานเร่งด่วนที่ต้องดำเนินการทันที
เรียงลำดับความสำคัญ ระบุชื่องาน สถานะ และเหตุผล

## 👥 การกระจายภาระงาน
วิเคราะห์ workload ของแต่ละคน ใครหนักเกินไป ใครว่างอยู่ และควรจัดสรรใหม่อย่างไร

## 📅 แผนงานตามช่วงเวลา
- สัปดาห์นี้: งานที่ต้องเสร็จและขั้นตอนที่ควรทำ
- สัปดาห์หน้า: งานที่จะครบกำหนดและการเตรียมพร้อม
- ระยะยาว: งานที่ยังไม่มีแผนชัดเจน

## 📈 การวิเคราะห์ความคืบหน้า
วิเคราะห์ว่าทีมกำลังเดินหน้าได้ดีหรือติดขัดตรงไหน มีแนวโน้มอย่างไร

## 💡 ข้อเสนอแนะเชิงปฏิบัติ
5 ข้อแนะนำที่เฉพาะเจาะจงและทำได้จริง เรียงตามความสำคัญ

## 🎯 Priority Actions สำหรับสัปดาห์นี้
3-5 สิ่งที่ควรทำเป็นอันดับแรก ระบุชื่องานและผู้รับผิดชอบ

ตอบด้วยภาษาไทยที่ชัดเจน เป็นมืออาชีพ และเป็นประโยชน์จริง`;

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
          { role: 'system', content: 'คุณเป็นที่ปรึกษาด้านการบริหารโปรเจกต์และทรัพยากรบุคคลระดับมืออาชีพ มีความเชี่ยวชาญด้านการวิเคราะห์ข้อมูล การจัดการความเสี่ยง และการวางแผนงาน ตอบเป็นภาษาไทยเสมอ ใช้ภาษาที่เป็นมืออาชีพ กระชับ และให้ข้อมูลที่เป็นประโยชน์จริง ไม่พูดซ้ำ ไม่กล่าวทั่วๆ' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 3000,
        temperature: 0.4,
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

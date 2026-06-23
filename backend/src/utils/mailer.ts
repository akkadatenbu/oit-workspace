import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendSystemActivationEmail = async (params: {
  to: string;
  inviterName: string;
  confirmUrl: string;
}) => {
  const { to, inviterName, confirmUrl } = params;
  await transporter.sendMail({
    from: `OIT WorkSpace <${process.env.SMTP_USER}>`,
    to,
    subject: `คุณได้รับสิทธิ์เข้าใช้งาน OIT WorkSpace`,
    html: `
      <div style="font-family:'Prompt',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">OIT WorkSpace</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Intelligent Task & Project Management</p>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">
            <strong>${inviterName}</strong> ได้เชิญคุณเข้าใช้งาน <strong style="color:#3b82f6;">OIT WorkSpace</strong> ของมหาวิทยาลัยนอร์ท-เชียงใหม่
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
            คุณสามารถสร้าง Workspace ของหน่วยงานตัวเองได้ทันทีหลังจากยืนยันการเข้าใช้งาน
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
              เปิดใช้งานบัญชีของฉัน
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
            ลิงก์นี้จะหมดอายุใน <strong>7 วัน</strong><br/>
            หากคุณไม่ได้รับคำเชิญนี้ สามารถเพิกเฉยอีเมลนี้ได้เลยครับ
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">OIT WorkSpace — มหาวิทยาลัยนอร์ท-เชียงใหม่</p>
        </div>
      </div>
    `,
  });
};

export const sendInvitationEmail = async (params: {
  to: string;
  projectName: string;
  inviterName: string;
  role: string;
  confirmUrl: string;
}) => {
  const { to, projectName, inviterName, role, confirmUrl } = params;

  const roleLabel = role === 'Member' ? 'Member (แก้ไขได้)' : 'Guest (ดูได้อย่างเดียว)';

  await transporter.sendMail({
    from: `OIT WorkSpace <${process.env.SMTP_USER}>`,
    to,
    subject: `คุณถูกเชิญเข้าร่วมโปรเจกต์ "${projectName}" – OIT WorkSpace`,
    html: `
      <div style="font-family:'Prompt',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">OIT WorkSpace</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Intelligent Task & Project Management</p>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">สวัสดีครับ/ค่ะ,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">
            <strong>${inviterName}</strong> ได้เชิญคุณเข้าร่วมโปรเจกต์
            <strong style="color:#3b82f6;">"${projectName}"</strong>
            ในฐานะ <span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:13px;font-weight:600;">${roleLabel}</span>
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
              ยืนยันการเข้าร่วมโปรเจกต์
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
            ลิงก์นี้จะหมดอายุใน <strong>7 วัน</strong><br/>
            หากคุณไม่ได้รับคำเชิญนี้ สามารถเพิกเฉยอีเมลนี้ได้เลยครับ
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">OIT WorkSpace — มหาวิทยาลัยนอร์ท-เชียงใหม่</p>
        </div>
      </div>
    `,
  });
};

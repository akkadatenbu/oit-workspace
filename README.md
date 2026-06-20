# OIT WorkSpace — Task & Project Management System

ระบบจัดการงานและโปรเจกต์สำหรับสำนักเทคโนโลยีสารสนเทศ มหาวิทยาลัยนอร์ท-เชียงใหม่  
สร้างขึ้นเพื่อใช้งานภายในองค์กร รองรับการทำงานร่วมกันแบบ multi-workspace

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | 18.3 / TS 5 |
| **Build Tool** | Vite | 8 |
| **Styling** | Tailwind CSS | 4.3 |
| **Backend** | Node.js + Express | Express 5.2 |
| **Runtime** | tsx (TypeScript runner) | 4.x |
| **Database ORM** | Prisma | 7.8 |
| **Database** | PostgreSQL | 14+ |
| **Auth** | Passport.js + Google OAuth 2.0 | — |
| **Drag & Drop** | @hello-pangea/dnd | 18 |
| **Email** | Nodemailer (SMTP Gmail) | — |
| **Excel Export** | SheetJS (xlsx) | — |
| **Process Manager** | PM2 | — |
| **Reverse Proxy** | Nginx | — |
| **Font** | Google Fonts — Prompt | — |

---

## Project Structure

```
OIT_Task_Management/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── auth/
│   │   │   └── passport.ts        # Google OAuth strategy
│   │   ├── routes/
│   │   │   ├── auth.routes.ts     # Login/logout/me
│   │   │   ├── space.routes.ts    # Workspace + SpaceMember
│   │   │   ├── project.routes.ts  # Project + ProjectMember
│   │   │   ├── task.routes.ts     # Task CRUD + assignees/comments
│   │   │   ├── folder.routes.ts   # Folder management
│   │   │   ├── invitation.routes.ts # Email invitation system
│   │   │   ├── notification.routes.ts # Bell notifications
│   │   │   ├── search.routes.ts   # Global search
│   │   │   ├── dashboard.routes.ts # Dashboard metrics
│   │   │   ├── admin.routes.ts    # Admin panel APIs
│   │   │   └── user.routes.ts     # User listing
│   │   ├── utils/
│   │   │   └── mailer.ts          # Nodemailer + email template
│   │   └── index.ts               # Express app entry point
│   ├── uploads/                   # Uploaded files (local storage)
│   ├── .env                       # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx    # User auth state
│   │   │   └── ThemeContext.tsx   # Light/Dark mode
│   │   ├── components/
│   │   │   ├── Sidebar.tsx        # Navigation + Space/Team management
│   │   │   ├── Navbar.tsx         # Search + Notifications + Theme toggle
│   │   │   └── Modal.tsx          # Reusable modal wrapper
│   │   ├── pages/
│   │   │   ├── Login.tsx          # Google OAuth login
│   │   │   ├── Dashboard.tsx      # Overview metrics
│   │   │   ├── ProjectView.tsx    # Kanban board + List view
│   │   │   ├── MyTasks.tsx        # Personal task view + export
│   │   │   ├── Members.tsx        # Workspace member management
│   │   │   ├── AdminPanel.tsx     # System administration
│   │   │   ├── ConfirmInvitation.tsx # Invitation confirmation
│   │   │   └── Help.tsx           # User manual
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx     # Sidebar + Navbar wrapper
│   │   ├── api/
│   │   │   └── client.ts          # Axios instance (dev/prod URL)
│   │   └── App.tsx                # Routes definition
│   └── package.json
│
├── deploy.sh                      # One-command deploy script
├── checklist_update_code.md       # Deploy checklist
└── README.md                      # This file
```

---

## Database Schema

```
User ─────────────────────────────────────────────
  id, email (unique), displayName, avatarUrl
  systemRole: Admin | Member | Guest
  createdAt

Space (Workspace) ─────────────────────────────────
  id, name, description
  ownerId → User (nullable, null = legacy)
  createdAt

SpaceMember ───────────────────────────────────────
  spaceId → Space
  userId  → User
  role: Member | Guest
  [PK: spaceId + userId]

Folder ────────────────────────────────────────────
  id, spaceId → Space, name, createdAt

Project ───────────────────────────────────────────
  id, spaceId → Space, folderId → Folder (nullable)
  name, description, status (Active/Archived)
  createdAt

ProjectMember ─────────────────────────────────────
  projectId → Project
  userId    → User
  role: Owner | Member | Guest
  [PK: projectId + userId]

Task ──────────────────────────────────────────────
  id, projectId → Project
  parentTaskId → Task (nullable, self-reference for subtasks)
  title, description
  status: ToDo | InProgress | Testing | Done
  priority: Low | Medium | High | Urgent
  progressPercent (0-100)
  dueDate (nullable)
  timeEstimate (nullable, e.g. "1d", "2h")
  createdById → User
  createdAt, updatedAt

TaskAssignee ──────────────────────────────────────
  taskId → Task, userId → User
  [PK: taskId + userId]

TaskAttachment ────────────────────────────────────
  id, taskId, fileName, filePath, source (Local/GoogleDrive)
  uploadedById, uploadedAt

TaskLink ──────────────────────────────────────────
  id, taskId, title, url, createdById

TaskComment ───────────────────────────────────────
  id, taskId, userId, text, createdAt

ProjectInvitation ─────────────────────────────────
  id, projectId (nullable), spaceId (nullable)
  email, token (unique), role, status (Pending/Accepted/Cancelled)
  invitedById, expiresAt (7 days), createdAt

Notification ──────────────────────────────────────
  id, userId, taskId (nullable)
  type (assigned/comment), message, isRead, createdAt
```

---

## API Endpoints

### Authentication
```
GET  /api/auth/google           → Redirect to Google OAuth
GET  /api/auth/google/callback  → OAuth callback
GET  /api/auth/me               → Current user info
POST /api/auth/logout           → Logout
```

### Spaces (Workspaces)
```
GET    /api/spaces                        → List accessible spaces
POST   /api/spaces                        → Create space (sets ownerId)
PATCH  /api/spaces/:id                    → Rename (owner/admin only)
DELETE /api/spaces/:id                    → Delete (owner/admin only)
POST   /api/spaces/:id/members            → Add team member + auto-add to all projects
DELETE /api/spaces/:id/members/:userId    → Remove + remove from all projects
POST   /api/spaces/:id/invite             → Send email invitation to space
GET    /api/spaces/:id/invitations        → List pending space invitations
PATCH  /api/spaces/:id/members/:userId/role → Change member role
```

### Projects
```
GET    /api/projects/:id                  → Get project with tasks/members (access check)
POST   /api/projects                      → Create (auto-add creator as Owner + SpaceMembers)
PATCH  /api/projects/:id                  → Update (name/folder/status)
DELETE /api/projects/:id                  → Delete
GET    /api/projects/:id/members          → List project members
POST   /api/projects/:id/members          → Add member
DELETE /api/projects/:id/members/:userId  → Remove member
POST   /api/projects/:id/invite           → Send email invitation to project
```

### Tasks
```
GET    /api/tasks                         → My tasks (created + assigned, no subtasks)
POST   /api/tasks                         → Create task/subtask
PATCH  /api/tasks/:id                     → Update (title/desc/priority/status/dueDate/timeEstimate/progressPercent)
PATCH  /api/tasks/:id/status              → Update status only (Kanban drag)
DELETE /api/tasks/:id                     → Delete
POST   /api/tasks/:id/assignees           → Add assignee + notification
DELETE /api/tasks/:id/assignees/:userId   → Remove assignee
POST   /api/tasks/:id/attachments         → Upload file
DELETE /api/tasks/attachments/:id         → Delete attachment
POST   /api/tasks/:id/links               → Add link
DELETE /api/tasks/links/:id               → Delete link
POST   /api/tasks/:id/comments            → Add comment + notification
```

### Invitations
```
GET  /api/invitations/:token              → Get invitation details (no auth)
POST /api/invitations/:token/confirm      → Confirm invitation (auth required)
DELETE /api/invitations/:id               → Cancel invitation
```

### Other
```
GET    /api/search?q=...                  → Global search (tasks + projects)
GET    /api/notifications                 → User notifications
PATCH  /api/notifications/read-all        → Mark all read
PATCH  /api/notifications/:id/read        → Mark one read
GET    /api/dashboard/metrics             → Stats (filtered by user access)
GET    /api/users?memberOnly=true         → Users (memberOnly = accepted invitation)
GET    /api/admin/stats                   → System statistics (Admin only)
GET    /api/admin/users                   → All users (Admin only)
PATCH  /api/admin/users/:id/role          → Change system role (Admin only)
GET    /api/admin/spaces                  → All spaces (Admin only)
PATCH  /api/admin/spaces/:id/owner        → Transfer ownership (Admin only)
GET    /api/health                        → Health check
```

---

## Access Control

### System Roles (systemRole)
| Role | Description |
|------|------------|
| `Admin` | เห็นและจัดการทุกอย่างในระบบ เข้า Admin Panel ได้ |
| `Member` | ใช้งานได้ทั่วไป เห็นเฉพาะ workspace ตัวเอง |
| `Guest` | เห็นเฉพาะ project ที่ถูก invite |

### Project Roles (ProjectRole)
| Role | Can Edit | Can Assign | Can Manage Members |
|------|---------|-----------|-------------------|
| `Owner` | ✅ | ✅ | ✅ |
| `Member` | ✅ (tasks) | ❌ | ❌ |
| `Guest` | ❌ | ❌ | ❌ |

### Space Access Logic
```
User เห็น Space ได้เมื่อ:
  1. เป็น Space Owner (ownerId === userId)
  2. เป็น SpaceMember
  3. เป็น ProjectMember ของ project ใน Space
  4. systemRole === 'Admin'
  5. ownerId === null (legacy spaces ก่อน migration)
```

---

## Authentication Flow

```
1. User คลิก "Continue with Google"
2. Redirect → Google OAuth → scope: profile, email
3. Callback → Passport.js
4. ถ้า email ลงท้าย @northbkk.ac.th → systemRole = Member
5. ถ้า email อื่น → systemRole = Guest
6. สร้าง User ใน DB (ถ้าใหม่) หรืออัปเดต (ถ้ามีแล้ว)
7. Session บันทึกใน express-session (24 ชั่วโมง)
8. Redirect → FRONTEND_URL/dashboard
```

---

## Email Invitation Flow

```
1. Space/Project Owner พิมพ์ email → ส่ง invite
2. Backend สร้าง ProjectInvitation (token unique, หมดอายุ 7 วัน)
3. Nodemailer ส่ง email (SMTP: smtp.gmail.com:587)
4. ผู้รับคลิกลิงก์ → /confirm-invitation/:token
5. ถ้า login อยู่ → กดยืนยัน → POST /api/invitations/:token/confirm
6. ถ้ายังไม่ login → บันทึก URL ใน localStorage → Google Login → กลับมา auto-confirm
7. Space invite: เพิ่มเป็น SpaceMember + auto ProjectMember ทุก project ใน space
8. Project invite: เพิ่มเป็น ProjectMember เฉพาะ project นั้น
```

---

## Environment Variables (backend/.env)

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=oitworkspace"
PORT=5525
NODE_ENV="production"
SESSION_SECRET="your-secret-key"
FRONTEND_URL="https://workspace.northbkk.ac.th"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="https://workspace.northbkk.ac.th/api/auth/google/callback"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="workspace@northbkk.ac.th"
SMTP_PASS="app-password-here"
```

---

## Deploy

### Server Info
```
Path:     /var/www/app/oit-workspace/
Backend:  /var/www/app/oit-workspace/backend/   (PM2: oit-workspace, port 5525)
Frontend: /var/www/app/oit-workspace/frontend/dist/  (Nginx static)
URL:      https://workspace.northbkk.ac.th
PM2:      /var/www/app/ecosystem.config.js
```

### Deploy Script
```bash
cd /var/www/app/oit-workspace
./deploy.sh
```

**deploy.sh ทำ:**
1. `git pull`
2. `npm install` (backend)
3. `npx prisma db push` — sync DB schema
4. `npx prisma generate` — regenerate Prisma client
5. `npm run build` — compile TypeScript → dist/
6. `pm2 restart oit-workspace`
7. `npm install` + `npm run build` (frontend)

### เมื่อมี DB Schema Change
ต้องรัน `prisma db push` ก่อน `npm run build` เสมอ

---

## Features Implemented

### Core
- [x] Google SSO (OAuth 2.0) — auto role by domain
- [x] Multi-workspace (Space) with ownership
- [x] Folder organization within Space
- [x] Project management
- [x] Task management (CRUD, subtasks, assignees)
- [x] Kanban Board (drag & drop, 4 statuses)
- [x] List View (sortable columns)
- [x] Task detail modal (2-column: main + comments)

### Task Features
- [x] Priority levels (Low/Medium/High/Urgent)
- [x] Due date + overdue indicator
- [x] Time Estimate (1d, 2h, etc.)
- [x] Progress bar (0-100%)
- [x] Subtasks with due date + estimate (inline edit)
- [x] File attachments (local upload)
- [x] External links
- [x] Comments (threaded)
- [x] Last Updated tracking

### Access Control
- [x] Space-level membership (SpaceMember)
- [x] Project-level membership (ProjectMember)
- [x] Role-based permissions (Owner/Member/Guest)
- [x] Email invitation system (7-day expiry)
- [x] Auto-add SpaceMembers to new projects

### UX
- [x] Global search (tasks + projects)
- [x] Bell notifications (assigned + commented)
- [x] My Tasks page (filter + sort + export Excel)
- [x] Dashboard metrics (user-scoped)
- [x] Dark/Light theme toggle (default: Light)
- [x] Thai language support (Prompt font)
- [x] Member management page

### Admin
- [x] Admin Panel (System Stats / Users / Workspaces)
- [x] Change user system role
- [x] Transfer space ownership

---

## Known Limitations / Future Work

- [ ] **Google Drive integration** — `source` field ใน TaskAttachment รอ implement
- [ ] **Calendar View** — ดู task ตาม due date
- [ ] **Bulk Actions** — เลือกหลาย task แล้ว update พร้อมกัน
- [ ] **Activity Log** — บันทึกทุก action ของ user
- [ ] **Task Templates** — สร้าง task จาก template
- [ ] **Recurring Tasks** — งานที่วนซ้ำ
- [ ] **File Preview** — preview ก่อน download
- [ ] **Email Notifications** — ส่ง email เมื่อ task ใกล้ due
- [ ] **WebSocket** — real-time update (ตอนนี้ใช้ polling 30s)
- [ ] **Mobile App** — PWA หรือ React Native

---

## Database Migration Notes

### ครั้งแรก (Initial Setup)
```sql
-- Set Admin role ให้ตัวเอง
UPDATE oitworkspace."User"
SET "systemRole" = 'Admin'
WHERE email = 'your@email.com';

-- Set ownerId ให้ Space เก่า (legacy)
UPDATE oitworkspace."Space"
SET "ownerId" = <your_user_id>
WHERE "ownerId" IS NULL;

-- Add yourself as Owner ใน project เก่า
INSERT INTO oitworkspace."ProjectMember" ("projectId", "userId", role)
SELECT id, <your_user_id>, 'Owner'
FROM oitworkspace."Project"
WHERE id NOT IN (
  SELECT "projectId" FROM oitworkspace."ProjectMember" WHERE "userId" = <your_user_id>
);
```

---

## Development Notes

- **tsx** ใช้รัน TypeScript ตรงๆ ไม่ต้อง compile ใน dev mode
- **Prisma Client** ถูก generate ใน `node_modules/@prisma/client` — ต้อง run `prisma generate` หลัง schema change
- **IDE TypeScript errors** สำหรับ Prisma types อาจเกิดหลัง generate ให้รัน `TypeScript: Restart TS Server` ใน VSCode
- **Session** ใช้ `express-session` — cookie name: `connect.sid` — maxAge: 24h
- **CORS** configured ให้รับจาก `localhost:5173` (dev) และ `workspace.northbkk.ac.th` (prod)
- **File uploads** เก็บที่ `backend/uploads/` — Thai filename supported via latin1→UTF-8 conversion

---

*Last updated: June 2026 | OIT WorkSpace v1.0*

import { useState } from 'react';
import {
  LayoutDashboard, Layers, CheckSquare, Users, Crown,
  List, Bell, Search, ChevronDown, ChevronRight, Building2
} from 'lucide-react';

interface Section {
  id: string;
  icon: any;
  title: string;
  color: string;
  content: { q: string; a: string }[];
}

const sections: Section[] = [
  {
    id: 'overview',
    icon: LayoutDashboard,
    title: 'ภาพรวมระบบ',
    color: 'blue',
    content: [
      {
        q: 'OIT WorkSpace คืออะไร?',
        a: 'ระบบจัดการงานและโปรเจกต์สำหรับทีม OIT มหาวิทยาลัยนอร์ทกรุงเทพ รองรับการทำงานร่วมกัน แบ่งเป็น Workspace → Folder → Project → Task ตามลำดับ'
      },
      {
        q: 'โครงสร้างของระบบเป็นอย่างไร?',
        a: 'Workspace (แผนก/ทีม) → Folder (กลุ่มงาน) → Project (โปรเจกต์) → Task (งาน) → Subtask (งานย่อย)'
      },
      {
        q: 'เข้าสู่ระบบด้วยอะไร?',
        a: 'ใช้ Google Account ของมหาวิทยาลัย (@northbkk.ac.th) — อีเมลนอกโดเมนสามารถเชิญเข้าได้เป็น Guest'
      }
    ]
  },
  {
    id: 'workspace',
    icon: Building2,
    title: 'Workspace (พื้นที่ทำงาน)',
    color: 'purple',
    content: [
      {
        q: 'สร้าง Workspace ได้อย่างไร?',
        a: 'คลิกปุ่ม "New Workspace" (กรอบ dashed) ด้านบน Sidebar → ตั้งชื่อ → สร้าง ผู้สร้างจะกลายเป็นเจ้าของ Workspace อัตโนมัติ'
      },
      {
        q: 'เพิ่มสมาชิกเข้า Workspace อย่างไร?',
        a: 'ไปที่เมนู "Members" → ฟอร์มด้านล่าง: ใส่ email → เลือก Workspace → เลือก Role → ส่งคำเชิญ ระบบจะส่ง email ลิงก์ยืนยัน หมดอายุใน 7 วัน'
      },
      {
        q: 'เมื่อเพิ่มสมาชิกเข้า Workspace แล้วจะเกิดอะไร?',
        a: 'สมาชิกจะเข้าถึงทุก Project ใน Workspace นั้นได้อัตโนมัติ และเมื่อสร้าง Project ใหม่ สมาชิกทีมจะถูกเพิ่มเข้าอัตโนมัติด้วย'
      },
      {
        q: 'ความแตกต่างของ Role ใน Workspace?',
        a: 'Member = แก้ไข task ได้ | Guest = ดูได้อย่างเดียว | เจ้าของ = จัดการสมาชิกและลบ Workspace ได้'
      }
    ]
  },
  {
    id: 'project',
    icon: Layers,
    title: 'Project (โปรเจกต์)',
    color: 'indigo',
    content: [
      {
        q: 'สร้าง Project อย่างไร?',
        a: 'Hover บนชื่อ Workspace ใน Sidebar → คลิกไอคอน + (New Project) → ตั้งชื่อ → สร้าง'
      },
      {
        q: 'จัดการ Folder อย่างไร?',
        a: 'Hover บนชื่อ Workspace → คลิกไอคอน Folder → ตั้งชื่อ Folder → สร้าง แล้วลาก Project เข้า Folder ได้โดยคลิกไอคอน FolderInput ในหน้า Project'
      },
      {
        q: 'มุมมอง Kanban Board และ List ต่างกันอย่างไร?',
        a: 'Kanban Board = ลาก-วาง card ระหว่าง 4 สถานะ (To Do/In Progress/Testing/Done) | List View = ตารางพร้อม sort และ filter ครบทุก column'
      },
      {
        q: 'เพิ่ม Project Member อย่างไร?',
        a: 'ในหน้า Project → คลิกปุ่ม Members (มุมขวาบน แสดง avatar) → ส่ง invite by email เจ้าของ Workspace สามารถเพิ่มได้เท่านั้น'
      }
    ]
  },
  {
    id: 'task',
    icon: CheckSquare,
    title: 'Task (งาน)',
    color: 'green',
    content: [
      {
        q: 'สร้าง Task อย่างไร?',
        a: 'ใน Kanban: คลิก "+ Add Task" ใต้แต่ละ column | ใน List: คลิกปุ่ม + ด้านบน'
      },
      {
        q: 'Task detail มีอะไรบ้าง?',
        a: 'ชื่องาน, Status, Priority, Time Estimate, Assignees, Due Date, Description, Progress (0-100%), Subtasks, Attachments, Links, Comments'
      },
      {
        q: 'Subtask คืออะไร?',
        a: 'งานย่อยภายใน Task สามารถมี due date และ estimate เป็นของตัวเอง tick checkbox เมื่อเสร็จแล้วได้ แก้ไขชื่อและ estimate ได้โดยตรง'
      },
      {
        q: 'Progress bar ใช้งานอย่างไร?',
        a: 'เลื่อน slider 0-100% ใน Task detail → สีเปลี่ยนตามเปอร์เซ็นต์ (ส้ม < 50%, น้ำเงิน 50-99%, เขียว 100%)'
      },
      {
        q: 'Time Estimate ใส่อะไรได้บ้าง?',
        a: 'ข้อความอิสระ เช่น "1d", "2h", "30m", "1d 4h" เป็นต้น แสดงเป็น badge สีม่วงบน card และ list'
      }
    ]
  },
  {
    id: 'mytasks',
    icon: List,
    title: 'My Tasks (งานของฉัน)',
    color: 'orange',
    content: [
      {
        q: 'My Tasks แสดงงานอะไรบ้าง?',
        a: 'แสดงทุก Task ที่คุณสร้าง หรือ ถูก assign มาให้ จาก Project ทุกอันที่คุณเป็นสมาชิก (ไม่รวม subtask)'
      },
      {
        q: 'กรองงานได้อย่างไร?',
        a: 'มี 4 filter: Status (All/To Do/In Progress/Testing/Done), Priority (Urgent/High/Medium/Low), Project, Due Date (Overdue/Today/This Week/No Date) กดปุ่ม X สีแดงเพื่อล้าง filter ทั้งหมด'
      },
      {
        q: 'Export Excel ทำงานอย่างไร?',
        a: 'คลิกปุ่ม "Export Excel" → ดาวน์โหลดไฟล์ .xlsx ที่มี column: Workspace, โปรเจกต์, ชื่องาน, ผู้รับผิดชอบ, สถานะ, ความสำคัญ, เวลาประมาณการ, วันกำหนดส่ง, อัปเดตล่าสุด รองรับภาษาไทย'
      },
      {
        q: 'คลิกที่ Task แล้วเกิดอะไร?',
        a: 'จะไปยังหน้า Project ของ Task นั้นและเปิด Task detail modal อัตโนมัติ'
      }
    ]
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications (แจ้งเตือน)',
    color: 'red',
    content: [
      {
        q: 'แจ้งเตือนเมื่อไหร่?',
        a: 'เมื่อมีคนเพิ่มคุณเป็น assignee ของ task หรือเมื่อมีคน comment ใน task ที่คุณสร้างหรือเป็น assignee'
      },
      {
        q: 'ดู notification อย่างไร?',
        a: 'คลิกไอคอนกระดิ่ง (Bell) ด้านขวาบน Navbar — มีตัวเลขแดงแสดงจำนวนที่ยังไม่อ่าน คลิกที่ notification เพื่อไปยัง task นั้น'
      },
      {
        q: 'Mark as Read ทำอย่างไร?',
        a: 'คลิกที่ notification แต่ละรายการ หรือกดปุ่ม "Mark all read" ด้านบนของ dropdown'
      }
    ]
  },
  {
    id: 'search',
    icon: Search,
    title: 'Search (ค้นหา)',
    color: 'teal',
    content: [
      {
        q: 'ค้นหาอะไรได้บ้าง?',
        a: 'ค้นหา Tasks (ตามชื่องาน) และ Projects (ตามชื่อ) ที่คุณมีสิทธิ์เข้าถึง'
      },
      {
        q: 'ใช้ Search อย่างไร?',
        a: 'พิมพ์ในช่อง Search ด้านบน Navbar → ผลลัพธ์จะแสดงหลัง 300ms (debounce) — คลิก Project เพื่อไปหน้านั้น คลิก Task เพื่อเปิด task detail โดยตรง กด Esc เพื่อปิด'
      }
    ]
  },
  {
    id: 'members',
    icon: Users,
    title: 'Members (การจัดการสมาชิก)',
    color: 'cyan',
    content: [
      {
        q: 'เพิ่มสมาชิกใหม่เข้าระบบอย่างไร?',
        a: 'เมนู "Members" → ฟอร์มด้านล่าง: ใส่ email → เลือก Workspace → เลือกสิทธิ์ → ส่งคำเชิญ ผู้รับจะได้ email พร้อมลิงก์ยืนยัน'
      },
      {
        q: 'เพิ่มคนที่อยู่ในระบบแล้วเข้า Workspace ใหม่?',
        a: 'Hover บนชื่อ Workspace ใน Sidebar → คลิกไอคอน 👥 → ค้นหาชื่อ/email → เลือก role → คลิก "+ เพิ่ม" — ไม่ต้องส่ง email ซ้ำ'
      },
      {
        q: 'เปลี่ยน role สมาชิกอย่างไร?',
        a: 'เมนู Members → คลิกปุ่ม "ลด → Guest" หรือ "เพิ่ม → Member" ข้างชื่อสมาชิก role จะ sync ไปยังทุก Project ใน Workspace อัตโนมัติ'
      },
      {
        q: 'ความแตกต่าง Member vs Guest?',
        a: 'Member = สร้าง/แก้ไข/ลบ task ได้ comment ได้ upload ไฟล์ได้ | Guest = ดูข้อมูลได้อย่างเดียว'
      }
    ]
  },
  {
    id: 'admin',
    icon: Crown,
    title: 'Admin Panel',
    color: 'yellow',
    content: [
      {
        q: 'ใครเข้า Admin Panel ได้?',
        a: 'เฉพาะ user ที่มี systemRole = Admin เท่านั้น จะเห็นเมนู "Admin Panel" (ไอคอนมงกุฎสีทอง) ใน Sidebar'
      },
      {
        q: 'Admin Panel มีอะไรบ้าง?',
        a: 'System Stats: ตัวเลขสรุปของระบบ | Users: ดูและเปลี่ยน role ของ user ทุกคน | Workspaces: ดูทุก workspace และโอนเจ้าของได้'
      },
      {
        q: 'จะตั้งตัวเองเป็น Admin ได้อย่างไร?',
        a: 'ต้องรัน SQL โดยตรงที่ Database: UPDATE oitworkspace."User" SET "systemRole" = \'Admin\' WHERE email = \'your@email.com\';'
      }
    ]
  }
];

const colorMap: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  green:  'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  red:    'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  teal:   'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
  cyan:   'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
  yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
};

const Help = () => {
  const [openSection, setOpenSection] = useState<string>('overview');
  const [openQ, setOpenQ] = useState<string | null>(null);

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 md:p-6">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-white font-bold text-lg">?</span>
          </div>
          คู่มือการใช้งาน
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">OIT WorkSpace — Intelligent Task & Project Management</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-8">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setOpenSection(s.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
              openSection === s.id
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-[#121212]'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[s.color]}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {sections.map(s => (
          <div
            key={s.id}
            className={`bg-white dark:bg-[#121212] border rounded-2xl shadow-sm overflow-hidden transition-all ${
              openSection === s.id ? 'border-blue-200 dark:border-blue-500/30' : 'border-gray-200 dark:border-white/5'
            }`}
          >
            {/* Section header */}
            <button
              onClick={() => setOpenSection(openSection === s.id ? '' : s.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorMap[s.color]}`}>
                <s.icon className="w-4.5 h-4.5" />
              </div>
              <span className="flex-1 text-base font-semibold text-gray-900 dark:text-white">{s.title}</span>
              <span className="text-xs text-gray-400">{s.content.length} หัวข้อ</span>
              {openSection === s.id
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </button>

            {/* Q&A list */}
            {openSection === s.id && (
              <div className="border-t border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
                {s.content.map((item, i) => {
                  const key = `${s.id}-${i}`;
                  const isOpen = openQ === key;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setOpenQ(isOpen ? null : key)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${colorMap[s.color]}`}>
                          Q
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{item.q}</span>
                        {isOpen
                          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        }
                      </button>
                      {isOpen && (
                        <div className="flex items-start gap-3 px-4 pb-3">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            A
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          OIT WorkSpace · มหาวิทยาลัยนอร์ทกรุงเทพ
        </p>
        <p className="text-xs text-gray-400 mt-1">หากพบปัญหาการใช้งาน ติดต่อผู้ดูแลระบบที่ Admin Panel</p>
      </div>
    </div>
  );
};

export default Help;

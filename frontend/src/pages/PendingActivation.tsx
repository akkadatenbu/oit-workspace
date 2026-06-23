import { Clock, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PendingActivation = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500">
            OIT WorkSpace
          </h1>
        </div>

        <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            รอการอนุมัติ
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            บัญชี <strong className="text-gray-700 dark:text-gray-300">{user?.email}</strong> ยังไม่ได้รับสิทธิ์เข้าใช้งาน
            <br />กรุณารอการเชิญจาก Admin หรือติดต่อผู้ดูแลระบบ
          </p>

          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> วิธีเข้าใช้งาน
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1.5">
              <li>• ติดต่อ Admin ให้ส่ง email คำเชิญมาให้</li>
              <li>• คลิกลิงก์ยืนยันใน email</li>
              <li>• login ใหม่อีกครั้งเพื่อเข้าใช้งาน</li>
            </ul>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          มหาวิทยาลัยนอร์ทกรุงเทพ · สำนักเทคโนโลยีสารสนเทศ
        </p>
      </div>
    </div>
  );
};

export default PendingActivation;

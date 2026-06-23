import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, Clock, Layers, LogIn } from 'lucide-react';

const googleAuthUrl = import.meta.env.DEV
  ? 'http://localhost:5525/api/auth/google'
  : '/api/auth/google';

const ConfirmInvitation = () => {
  const { token } = useParams<{ token: string }>();

  const { user, loading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // โหลดรายละเอียด invitation
  useEffect(() => {
    if (!token) return;
    apiClient.get(`/invitations/${token}`)
      .then(({ data }) => { setInvitation(data); setStatus('ready'); })
      .catch(err => {
        const msg = err.response?.data?.error || 'ไม่พบคำเชิญนี้';
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [token]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const { data } = await apiClient.post(`/invitations/${token}/confirm`);
      setStatus('success');
      const dest = data.type === 'system' ? '/dashboard'
        : data.type === 'space' ? '/members'
        : `/projects/${data.projectId}`;
      // force full reload เพื่อ refresh session/auth context (isActive อาจยัง false ในหน่วยความจำ)
      setTimeout(() => { window.location.href = dest; }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'เกิดข้อผิดพลาด');
      setStatus('error');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLoginToConfirm = () => {
    // เก็บ URL ปัจจุบันไว้ กลับมาหลัง login
    localStorage.setItem('pendingRedirect', window.location.pathname);
    window.location.href = googleAuthUrl;
  };

  const isLoading = authLoading || status === 'loading';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500">
            OIT WorkSpace
          </h1>
        </div>

        <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-8">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center py-6">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลคำเชิญ...</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center py-4 text-center">
              <XCircle className="w-14 h-14 text-red-400 mb-4" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">คำเชิญไม่ถูกต้อง</h2>
              <p className="text-sm text-gray-500">{errorMsg}</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 className="w-14 h-14 text-green-400 mb-4" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">เปิดใช้งานสำเร็จ!</h2>
              <p className="text-sm text-gray-500">กำลังพาคุณเข้าสู่ระบบ...</p>
            </div>
          )}

          {/* Ready — show invitation details */}
          {status === 'ready' && invitation && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">
                    {invitation.spaceId ? 'คุณถูกเชิญเข้าร่วม Workspace'
                     : invitation.projectId ? 'คุณถูกเชิญเข้าร่วม Project'
                     : 'คุณได้รับสิทธิ์เข้าใช้งาน'}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {invitation.space?.name || invitation.project?.name || 'OIT WorkSpace'}
                  </h2>
                </div>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500">เชิญโดย</span>
                  <span className="font-medium text-gray-900 dark:text-white">{invitation.invitedBy?.displayName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500">บทบาท</span>
                  <span className="font-medium text-gray-900 dark:text-white">{invitation.role}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">ส่งถึง</span>
                  <span className="font-medium text-gray-900 dark:text-white">{invitation.email}</span>
                </div>
              </div>

              {/* Expiry warning */}
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mb-6">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>หมดอายุ: {new Date(invitation.expiresAt).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
              </div>

              {/* Not logged in */}
              {!user ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-4">กรุณาเข้าสู่ระบบด้วย Google เพื่อยืนยันการเข้าร่วม</p>
                  <button
                    onClick={handleLoginToConfirm}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    เข้าสู่ระบบด้วย Google เพื่อยืนยัน
                  </button>
                </div>
              ) : (
                /* Logged in */
                <div>
                  <p className="text-xs text-gray-500 text-center mb-4">
                    เข้าสู่ระบบในฐานะ <strong>{user.email}</strong>
                  </p>
                  {invitation.email.toLowerCase() !== user.email?.toLowerCase() && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mb-4 text-center">
                      คำเชิญนี้ส่งถึง {invitation.email} แต่คุณ login ด้วย {user.email}
                    </div>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {isConfirming ? 'กำลังยืนยัน...' : 'ยืนยันเข้าร่วมโปรเจกต์'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmInvitation;

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, Crown, Shield, User, X, Mail, ChevronDown, Clock } from 'lucide-react';
import Swal from 'sweetalert2';

const roleBadge = (role: string) => {
  if (role === 'Owner') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
      <Crown className="w-3 h-3" />Owner
    </span>
  );
  if (role === 'Member') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
      <Shield className="w-3 h-3" />Member
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
      <User className="w-3 h-3" />Guest
    </span>
  );
};

const Members = () => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Member' | 'Guest'>('Member');
  const [isInviting, setIsInviting] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId);

  const fetchSpaces = async () => {
    try {
      const { data } = await apiClient.get('/spaces');
      // แสดงเฉพาะ space ที่ user เป็นเจ้าของ (สามารถจัดการได้)
      const owned = data.filter((s: any) => s.ownerId === user?.id || user?.systemRole === 'Admin');
      setSpaces(owned);
      if (owned.length > 0 && !selectedSpaceId) setSelectedSpaceId(owned[0].id);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const fetchPending = async (spaceId: number) => {
    try {
      const { data } = await apiClient.get(`/spaces/${spaceId}/invitations`);
      setPendingInvitations(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchSpaces();
    // auto-refresh ทุก 10 วินาที เพื่อจับสถานะที่เปลี่ยนจาก Pending → Accepted
    const interval = setInterval(() => {
      fetchSpaces();
      if (selectedSpaceId) fetchPending(selectedSpaceId);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSpaceId) {
      fetchPending(selectedSpaceId);
      // เริ่ม polling pending ใหม่ทุกครั้งที่เปลี่ยน space
      const interval = setInterval(() => {
        fetchSpaces();
        fetchPending(selectedSpaceId);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedSpaceId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedSpaceId) return;
    try {
      setIsInviting(true);
      await apiClient.post(`/spaces/${selectedSpaceId}/invite`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      fetchPending(selectedSpaceId);
      Swal.fire({ icon: 'success', title: 'ส่งคำเชิญแล้ว!', text: `ส่งลิงก์ไปที่ ${inviteEmail.trim()} เรียบร้อย`, timer: 3000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to send invitation', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (userId: number, name: string, currentRole: string) => {
    if (!selectedSpaceId) return;
    const newRole = currentRole === 'Member' ? 'Guest' : 'Member';
    const { isConfirmed } = await Swal.fire({
      title: `เปลี่ยน role ของ "${name}"`,
      text: `เปลี่ยนจาก ${currentRole} → ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน'
    });
    if (!isConfirmed) return;
    try {
      await apiClient.patch(`/spaces/${selectedSpaceId}/members/${userId}/role`, { role: newRole });
      fetchSpaces();
    } catch {
      Swal.fire('Error', 'Failed to change role', 'error');
    }
  };

  const handleRemove = async (userId: number, name: string) => {
    if (!selectedSpaceId) return;
    const { isConfirmed } = await Swal.fire({
      title: `ลบ "${name}" ออกจากทีม?`,
      text: 'จะถูกลบออกจากทุก project ใน workspace นี้ด้วย',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'ลบออก'
    });
    if (!isConfirmed) return;
    try {
      await apiClient.delete(`/spaces/${selectedSpaceId}/members/${userId}`);
      fetchSpaces();
    } catch {
      Swal.fire('Error', 'Failed to remove member', 'error');
    }
  };

  const handleCancelInvite = async (invId: number) => {
    try {
      await apiClient.delete(`/invitations/${invId}`);
      if (selectedSpaceId) fetchPending(selectedSpaceId);
    } catch {
      Swal.fire('Error', 'Failed to cancel invitation', 'error');
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (spaces.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ยังไม่มี Workspace</h2>
      <p className="text-gray-500 text-sm">สร้าง Workspace ก่อน แล้วจึงเพิ่มสมาชิกทีมได้</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-4 md:p-6">
      {/* Header */}
      <div className="mb-3 shrink-0">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" /> Members
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">จัดการสมาชิกทีมของแต่ละ Workspace</p>
      </div>

      {/* Workspace selector — ด้านบนตาราง */}
      <div className="flex items-center gap-3 mb-2 shrink-0">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">Workspace:</span>
        <div className="relative">
          <select
            value={selectedSpaceId ?? ''}
            onChange={e => setSelectedSpaceId(Number(e.target.value))}
            className="pl-3 pr-8 py-2 text-sm font-medium bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer shadow-sm"
          >
            {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <span className="text-sm text-gray-400">
          ({selectedSpace?.members?.length ?? 0} สมาชิก)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {/* ── Current Members ── */}
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              สมาชิกทีม
              <span className="text-sm font-normal text-gray-500">
                ({selectedSpace?.members?.length ?? 0} คน)
              </span>
            </h3>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{selectedSpace?.name}</span>
          </div>

          {(!selectedSpace?.members || selectedSpace.members.length === 0) ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              ยังไม่มีสมาชิก — ใช้ฟอร์มด้านล่างเพื่อส่งคำเชิญ
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">สมาชิก</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">สิทธิ์</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">หน้าที่</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {selectedSpace?.members?.map((m: any) => (
                  <tr key={m.userId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                          {m.user?.avatarUrl
                            ? <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-sm font-bold text-blue-600">{m.user?.displayName?.charAt(0)}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.user?.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">{roleBadge(m.role)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {m.role === 'Member' ? 'แก้ไขได้' : m.role === 'Guest' ? 'อ่านได้อย่างเดียว' : 'เจ้าของ'}
                    </td>
                    <td className="px-4 py-2">
                      {m.role !== 'Owner' && (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleChangeRole(m.userId, m.user?.displayName, m.role)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                            title={`เปลี่ยนเป็น ${m.role === 'Member' ? 'Guest' : 'Member'}`}
                          >
                            <ChevronDown className="w-3 h-3" />
                            {m.role === 'Member' ? 'ลด → Guest' : 'เพิ่ม → Member'}
                          </button>
                          <button
                            onClick={() => handleRemove(m.userId, m.user?.displayName)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                            title="ลบออกจากทีม"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pending Invitations ── */}
        {pendingInvitations.length > 0 && (
          <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                รอยืนยัน ({pendingInvitations.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-white/5">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-4 py-2">
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inv.email}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      รอยืนยัน · {inv.role} · หมดอายุ {new Date(inv.expiresAt).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors shrink-0"
                    title="ยกเลิกคำเชิญ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Invite Form ── */}
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> เชิญสมาชิกใหม่

          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            ระบบจะส่งลิงก์ยืนยันไปที่ email — เมื่อยืนยันแล้วจะเข้าถึงทุก project ใน workspace ที่เลือกได้อัตโนมัติ
          </p>
          <form onSubmit={handleSendInvite} className="flex flex-wrap gap-2 items-center">
            {/* Email */}
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@northbkk.ac.th"
              className="flex-1 min-w-[220px] px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-normal"
              required
            />
            {/* Workspace */}
            <div className="relative shrink-0">
              <select
                value={selectedSpaceId ?? ''}
                onChange={e => setSelectedSpaceId(Number(e.target.value))}
                className="pl-3 pr-8 py-2.5 text-sm bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-normal appearance-none cursor-pointer"
                required
              >
                {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Role */}
            <div className="relative shrink-0">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'Member' | 'Guest')}
                className="pl-3 pr-8 py-2.5 text-sm bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-normal appearance-none cursor-pointer"
              >
                <option value="Member">Member — แก้ไขได้</option>
                <option value="Guest">Guest — อ่านได้อย่างเดียว</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Submit */}
            <button
              type="submit"
              disabled={isInviting || !inviteEmail.trim() || !selectedSpaceId}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              {isInviting ? 'กำลังส่ง...' : 'ส่งคำเชิญ'}
            </button>
          </form>

          {/* Role description */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Member</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">สร้าง แก้ไข ลบ task ได้ · comment ได้ · upload ไฟล์ได้</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Guest</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ดูข้อมูลได้อย่างเดียว · ไม่สามารถแก้ไขหรือสร้างได้</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Members;

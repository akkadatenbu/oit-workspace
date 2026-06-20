import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Users, Layers, CheckCircle2, BarChart2, Crown,
  Shield, User, ChevronDown, RefreshCw, Building2
} from 'lucide-react';
import Swal from 'sweetalert2';

const roleBadge = (role: string) => {
  if (role === 'Admin') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"><Crown className="w-3 h-3" />Admin</span>;
  if (role === 'Member') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Shield className="w-3 h-3" />Member</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"><User className="w-3 h-3" />Guest</span>;
};

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'spaces'>('stats');
  const [stats, setStats]   = useState<any>(null);
  const [users, setUsers]   = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  if (user && user.systemRole !== 'Admin') return <Navigate to="/dashboard" replace />;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, u, sp, au] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/users'),
        apiClient.get('/admin/spaces'),
        apiClient.get('/users'),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setSpaces(sp.data);
      setAllUsers(au.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleToggleStatus = async (userId: number, displayName: string, isActive: boolean) => {
    const action = isActive ? 'ระงับ' : 'เปิดใช้งาน';
    const { isConfirmed } = await Swal.fire({
      title: `${action} "${displayName}"?`,
      text: isActive
        ? 'user จะไม่สามารถ login เข้าระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง'
        : 'user จะสามารถ login เข้าระบบได้อีกครั้ง',
      icon: isActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#ef4444' : '#3b82f6',
      confirmButtonText: action
    });
    if (!isConfirmed) return;
    try {
      await apiClient.patch(`/admin/users/${userId}/status`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
      Swal.fire({ icon: 'success', title: `${action}แล้ว`, timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleChangeRole = async (userId: number, displayName: string, currentRole: string) => {
    const { value: newRole } = await Swal.fire({
      title: `เปลี่ยน Role ของ "${displayName}"`,
      input: 'select',
      inputOptions: { Admin: 'Admin', Member: 'Member', Guest: 'Guest' },
      inputValue: currentRole,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
    });
    if (!newRole || newRole === currentRole) return;
    try {
      await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, systemRole: newRole } : u));
      Swal.fire({ icon: 'success', title: 'เปลี่ยน Role แล้ว', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleTransferOwner = async (spaceId: number, spaceName: string) => {
    const options: Record<string, string> = {};
    allUsers.forEach((u: any) => { options[u.id] = `${u.displayName} (${u.email})`; });
    const { value: ownerId } = await Swal.fire({
      title: `โอนเจ้าของ "${spaceName}"`,
      input: 'select',
      inputOptions: options,
      showCancelButton: true,
      confirmButtonText: 'โอน',
    });
    if (!ownerId) return;
    try {
      await apiClient.patch(`/admin/spaces/${spaceId}/owner`, { ownerId });
      await fetchAll();
      Swal.fire({ icon: 'success', title: 'โอนแล้ว', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire('Error', 'Failed to transfer ownership', 'error');
    }
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const tabs = [
    { key: 'stats',  label: 'System Stats',  icon: BarChart2 },
    { key: 'users',  label: 'Users',          icon: Users },
    { key: 'spaces', label: 'Workspaces',     icon: Building2 },
  ] as const;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-500" /> Admin Panel
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">จัดการระบบ OIT WorkSpace</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-white/5 rounded-xl p-1 shrink-0 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ── Stats Tab ── */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Users ทั้งหมด',      value: stats.totalUsers,         icon: Users,        color: 'blue' },
                  { label: 'Workspaces',           value: stats.totalSpaces,         icon: Building2,    color: 'purple' },
                  { label: 'Projects',             value: stats.totalProjects,       icon: Layers,       color: 'indigo' },
                  { label: 'Tasks ทั้งหมด',       value: stats.totalTasks,          icon: BarChart2,    color: 'orange' },
                  { label: 'Tasks เสร็จแล้ว',     value: stats.completedTasks,      icon: CheckCircle2, color: 'green' },
                  { label: 'Pending Invitations',  value: stats.pendingInvitations,  icon: RefreshCw,    color: 'amber' },
                ].map(card => (
                  <div key={card.label} className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl bg-${card.color}-100 dark:bg-${card.color}-500/20 flex items-center justify-center mb-3`}>
                      <card.icon className={`w-5 h-5 text-${card.color}-600 dark:text-${card.color}-400`} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Completion rate */}
              <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Task Completion Rate</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats.completionRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                    style={{ width: `${stats.completionRate}%` }} />
                </div>
              </div>

              {/* Recent users */}
              <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">User ล่าสุด</h3>
                <div className="space-y-3">
                  {stats.recentUsers?.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-blue-600">{u.displayName?.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      {roleBadge(u.systemRole)}
                      <span className="text-xs text-gray-400 shrink-0">{new Date(u.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Users Tab ── */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-0">
              {/* Search */}
              <div className="p-4 border-b border-gray-200 dark:border-white/5">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="ค้นหาชื่อหรืออีเมล..."
                  className="w-full max-w-sm px-4 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white font-normal"
                />
              </div>
              <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">เข้าร่วม</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                              {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xs font-bold text-blue-600">{u.displayName?.charAt(0)}</span>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.displayName}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {roleBadge(u.systemRole)}
                            {!u.isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{u._count?.createdTasks ?? 0}</td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{u._count?.projects ?? 0}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString('th-TH')}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleChangeRole(u.id, u.displayName, u.systemRole)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                              Role <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id, u.displayName, u.isActive)}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                u.isActive
                                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                                  : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'
                              }`}
                            >
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-200 dark:border-white/5 text-xs text-gray-500">
                แสดง {filteredUsers.length} จาก {users.length} users
              </div>
            </div>
          )}

          {/* ── Spaces Tab ── */}
          {activeTab === 'spaces' && (
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">เจ้าของ</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">สร้างเมื่อ</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {spaces.map((sp: any) => (
                      <tr key={sp.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                              <span className="text-white font-bold text-xs">{sp.name?.charAt(0)}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{sp.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {sp.owner ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                                {sp.owner.avatarUrl ? <img src={sp.owner.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-[9px] font-bold text-blue-600">{sp.owner.displayName?.charAt(0)}</span>}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{sp.owner.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">ไม่มีเจ้าของ (legacy)</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{sp._count?.projects ?? 0}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{new Date(sp.createdAt).toLocaleDateString('th-TH')}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleTransferOwner(sp.id, sp.name)}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            โอนเจ้าของ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

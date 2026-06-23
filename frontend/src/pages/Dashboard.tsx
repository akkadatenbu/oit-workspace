import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const statusColors: Record<string, string> = {
  ToDo:       '#94a3b8',
  InProgress: '#3b82f6',
  Testing:    '#f97316',
  Done:       '#22c55e',
};
const statusLabels: Record<string, string> = {
  ToDo: 'To Do', InProgress: 'In Progress', Testing: 'Testing', Done: 'Done'
};

const formatRelative = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics]   = useState({ activeProjects: 0, tasksDueSoon: 0, completedTasks: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [chart, setChart]       = useState<{ statusData: any[]; trendData: any[] }>({ statusData: [], trendData: [] });
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/dashboard/metrics'),
      apiClient.get('/dashboard/activity'),
      apiClient.get('/dashboard/chart'),
    ]).then(([m, a, c]) => {
      setMetrics(m.data);
      setActivity(a.data);
      setChart(c.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Welcome back, {user?.displayName || 'NBU IT Team'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-base">ภาพรวม Workspace ของคุณวันนี้</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Active Projects',  value: metrics.activeProjects,  icon: TrendingUp,   color: 'blue',   border: 'hover:border-blue-400 dark:hover:border-blue-500/50' },
          { label: 'Tasks Due Soon',   value: metrics.tasksDueSoon,    icon: AlertCircle,  color: 'orange', border: 'hover:border-orange-400 dark:hover:border-orange-500/50', bold: true },
          { label: 'Completed Tasks',  value: metrics.completedTasks,  icon: CheckCircle2, color: 'green',  border: 'hover:border-green-400 dark:hover:border-green-500/50', bold: true },
        ].map(card => (
          <div key={card.label} className={`bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-colors ${card.border}`}>
            <div className="absolute -right-5 -top-5 text-gray-500/5 dark:text-white/5 group-hover:scale-110 transition-transform">
              <card.icon className="w-28 h-28" />
            </div>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`p-2 bg-${card.color}-100 dark:bg-${card.color}-500/20 rounded-xl`}>
                <card.icon className={`w-5 h-5 text-${card.color}-600 dark:text-${card.color}-400`} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{card.label}</p>
            </div>
            <p className={`text-4xl font-bold ${card.bold ? `text-${card.color}-600 dark:text-${card.color}-400` : 'text-gray-900 dark:text-white'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Productivity Chart */}
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">งานเสร็จ 7 วันที่ผ่านมา</h3>
          <p className="text-xs text-gray-400 mb-4">จำนวนงานที่เปลี่ยนสถานะเป็น Done</p>
          {chart.trendData.every(d => d.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">ยังไม่มีงานที่เสร็จในช่วงนี้</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chart.trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                  formatter={(v: any) => [`${v} งาน`, 'เสร็จแล้ว']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Status Distribution mini pie */}
          {chart.statusData.some(d => d.count > 0) && (
            <>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-5 mb-3">สัดส่วนตามสถานะ</h3>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={chart.statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={45} strokeWidth={0}>
                      {chart.statusData.map((d: any) => (
                        <Cell key={d.status} fill={statusColors[d.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {chart.statusData.map((d: any) => (
                    <div key={d.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: statusColors[d.status] }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{statusLabels[d.status]}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Recent Activity
          </h3>
          {activity.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">ยังไม่มีกิจกรรมล่าสุด</div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[320px] custom-scrollbar pr-1">
              {activity.map((task: any) => (
                <button
                  key={task.id}
                  onClick={() => navigate(`/projects/${task.project?.id}?openTask=${task.id}`)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: statusColors[task.status] || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${statusColors[task.status]}20`, color: statusColors[task.status] }}>
                        {statusLabels[task.status]}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">{task.project?.name}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{formatRelative(task.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Dashboard overview stats at bottom */}
      {chart.statusData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {chart.statusData.map((d: any) => (
            <div key={d.status} className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${statusColors[d.status]}20` }}>
                <LayoutDashboard className="w-4 h-4" style={{ color: statusColors[d.status] }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{d.count}</p>
                <p className="text-[10px] text-gray-500">{statusLabels[d.status]}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { apiClient } from '../api/client';
import { CheckSquare, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X, Clock, FileDown, Timer } from 'lucide-react';

type SortField = 'title' | 'project' | 'assignees' | 'status' | 'priority' | 'dueDate' | 'lastUpdated' | 'timeEstimate';
type SortDir = 'asc' | 'desc';

const statusLabels: Record<string, string> = {
  ToDo: 'To Do', InProgress: 'In Progress', Testing: 'Testing', Done: 'Done',
};
const statusOrder: Record<string, number>   = { ToDo: 1, InProgress: 2, Testing: 3, Done: 4 };
const priorityOrder: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

const getPriorityColor = (p: string) => {
  switch (p) {
    case 'Urgent': return 'text-red-500 bg-red-100 dark:bg-red-400/10 border-red-200 dark:border-red-400/20';
    case 'High':   return 'text-orange-500 bg-orange-100 dark:bg-orange-400/10 border-orange-200 dark:border-orange-400/20';
    case 'Medium': return 'text-blue-500 bg-blue-100 dark:bg-blue-400/10 border-blue-200 dark:border-blue-400/20';
    default:       return 'text-gray-500 bg-gray-100 dark:bg-gray-400/10 border-gray-200 dark:border-gray-400/20';
  }
};

const getStatusColor = (s: string) => {
  switch (s) {
    case 'ToDo':       return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    case 'InProgress': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'Testing':    return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'Done':       return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    default:           return 'bg-gray-100 text-gray-600';
  }
};

const getLastUpdated = (task: any): Date => {
  const base = new Date(task.updatedAt || task.createdAt);
  if (!task.comments?.length) return base;
  const latest = task.comments.reduce((a: any, b: any) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  );
  const commentDate = new Date(latest.createdAt);
  return commentDate > base ? commentDate : base;
};

const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getFirstAssigneeName = (task: any): string =>
  task.assignees?.[0]?.user?.displayName ?? '';

const MyTasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ────────────────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState('All');
  const [filterProject,  setFilterProject]  = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterDue,      setFilterDue]      = useState('All');

  // ── Sort ───────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDir,   setSortDir]   = useState<SortDir>('asc');

  useEffect(() => {
    apiClient.get('/tasks')
      .then(({ data }) => setTasks(data))
      .catch(err => console.error('Failed to load tasks', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 md:p-6">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse">Loading Tasks...</p>
      </div>
    );
  }

  const uniqueProjects = [...new Set(tasks.map(t => t.project?.name).filter(Boolean))] as string[];
  const activeFilterCount = [filterStatus, filterProject, filterPriority, filterDue].filter(f => f !== 'All').length;

  const resetFilters = () => {
    setFilterStatus('All');
    setFilterProject('All');
    setFilterPriority('All');
    setFilterDue('All');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-blue-500" />
      : <ChevronDown className="w-3.5 h-3.5 ml-1 text-blue-500" />;
  };

  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  const filtered = tasks
    .filter(t => filterStatus   === 'All' || t.status        === filterStatus)
    .filter(t => filterProject  === 'All' || t.project?.name === filterProject)
    .filter(t => filterPriority === 'All' || t.priority      === filterPriority)
    .filter(t => {
      if (filterDue === 'All')    return true;
      if (filterDue === 'NoDate') return !t.dueDate;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      if (filterDue === 'Overdue') return d < today && t.status !== 'Done';
      if (filterDue === 'Today')   return d >= today && d <= todayEnd;
      if (filterDue === 'Week')    return d >= today && d <= weekEnd;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'title')       return dir * a.title.localeCompare(b.title, 'th');
      if (sortField === 'project')     return dir * ((a.project?.name || '').localeCompare(b.project?.name || '', 'th'));
      if (sortField === 'assignees')   return dir * getFirstAssigneeName(a).localeCompare(getFirstAssigneeName(b), 'th');
      if (sortField === 'status')      return dir * ((statusOrder[a.status]     || 0) - (statusOrder[b.status]     || 0));
      if (sortField === 'priority')    return dir * ((priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
      if (sortField === 'lastUpdated')   return dir * (getLastUpdated(a).getTime() - getLastUpdated(b).getTime());
      if (sortField === 'timeEstimate')  return dir * (a.timeEstimate || '').localeCompare(b.timeEstimate || '', 'th');
      if (sortField === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dir * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      }
      return 0;
    });

  // ── Export Excel ───────────────────────────────────────────
  const exportToExcel = () => {
    const rows = filtered.map(task => ({
      'Workspace':       task.project?.space?.name || '-',
      'โปรเจกต์':        task.project?.name || '-',
      'ชื่องาน':         task.title,
      'ผู้รับผิดชอบ':     task.assignees?.map((a: any) => a.user?.displayName).join(', ') || 'ไม่มี',
      'สถานะ':           statusLabels[task.status] || task.status,
      'ความสำคัญ':        task.priority,
      'เวลาประมาณการ':    task.timeEstimate || '-',
      'วันกำหนดส่ง':      task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-',
      'อัปเดตล่าสุด':     getLastUpdated(task).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // ปรับความกว้างคอลัมน์อัตโนมัติ
    const colWidths = Object.keys(rows[0] ?? {}).map(key => ({
      wch: Math.max(key.length + 4, ...rows.map(r => String((r as any)[key] ?? '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Tasks');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `my-tasks-${date}.xlsx`);
  };

  // ── Shared class strings ────────────────────────────────────
  const selectCls = 'bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none appearance-none cursor-pointer px-2 py-0.5';
  const thBtnCls  = 'flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap';

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="shrink-0 mb-5">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Tasks</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              {filtered.length} of {tasks.length} tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export button */}
            <button
              onClick={exportToExcel}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
            </button>

            {/* Reset filters button */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121212] border rounded-xl transition-colors ${filterStatus !== 'All' ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-white/10'}`}>
            <Filter className={`w-3.5 h-3.5 shrink-0 ${filterStatus !== 'All' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option className="py-1.5 px-3" value="All">All Statuses</option>
              <option className="py-1.5 px-3" value="ToDo">To Do</option>
              <option className="py-1.5 px-3" value="InProgress">In Progress</option>
              <option className="py-1.5 px-3" value="Testing">Testing</option>
              <option className="py-1.5 px-3" value="Done">Done</option>
            </select>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121212] border rounded-xl transition-colors ${filterPriority !== 'All' ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-white/10'}`}>
            <Filter className={`w-3.5 h-3.5 shrink-0 ${filterPriority !== 'All' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selectCls}>
              <option className="py-1.5 px-3" value="All">All Priorities</option>
              <option className="py-1.5 px-3" value="Urgent">Urgent</option>
              <option className="py-1.5 px-3" value="High">High</option>
              <option className="py-1.5 px-3" value="Medium">Medium</option>
              <option className="py-1.5 px-3" value="Low">Low</option>
            </select>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121212] border rounded-xl transition-colors ${filterProject !== 'All' ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-white/10'}`}>
            <Filter className={`w-3.5 h-3.5 shrink-0 ${filterProject !== 'All' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className={`${selectCls} max-w-[160px]`}>
              <option className="py-1.5 px-3" value="All">All Projects</option>
              {uniqueProjects.map(p => <option className="py-1.5 px-3" key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121212] border rounded-xl transition-colors ${filterDue !== 'All' ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-white/10'}`}>
            <Clock className={`w-3.5 h-3.5 shrink-0 ${filterDue !== 'All' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select value={filterDue} onChange={e => setFilterDue(e.target.value)} className={selectCls}>
              <option className="py-1.5 px-3" value="All">All Due Dates</option>
              <option className="py-1.5 px-3" value="Overdue">Overdue</option>
              <option className="py-1.5 px-3" value="Today">Due Today</option>
              <option className="py-1.5 px-3" value="Week">Due This Week</option>
              <option className="py-1.5 px-3" value="NoDate">No Due Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-white/5 p-10 text-center shadow-sm">
          <CheckSquare className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No tasks assigned</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">You're all caught up! Check out active projects to find new tasks.</p>
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 sticky top-0 z-10">
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('title')} className={thBtnCls}>
                      Task Name <SortIcon field="title" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('project')} className={thBtnCls}>
                      Project <SortIcon field="project" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('assignees')} className={thBtnCls}>
                      Assignees <SortIcon field="assignees" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('status')} className={thBtnCls}>
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('priority')} className={thBtnCls}>
                      Priority <SortIcon field="priority" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('timeEstimate')} className={thBtnCls}>
                      Estimate <SortIcon field="timeEstimate" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('dueDate')} className={thBtnCls}>
                      Due Date <SortIcon field="dueDate" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('lastUpdated')} className={thBtnCls}>
                      Last Updated <SortIcon field="lastUpdated" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Filter className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No tasks match your filters</p>
                      <button onClick={resetFilters} className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Clear all filters
                      </button>
                    </td>
                  </tr>
                ) : filtered.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.status !== 'Done';
                  const lastUp    = getLastUpdated(task);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/projects/${task.projectId}?openTask=${task.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-2">
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {task.title}
                        </div>
                      </td>
                      <td className="px-5 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {task.project?.name || '—'}
                      </td>
                      <td className="px-5 py-2">
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="flex -space-x-2">
                            {task.assignees.map((a: any) => (
                              <div
                                key={a.userId}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-2 border-white dark:border-[#121212] text-xs font-bold shrink-0 overflow-hidden"
                                title={a.user?.displayName}
                              >
                                {a.user?.avatarUrl
                                  ? <img src={a.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                  : a.user?.displayName?.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {statusLabels[task.status] || task.status}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        {task.timeEstimate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-2 py-0.5 rounded-md">
                            <Timer className="w-3 h-3" />{task.timeEstimate}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        {task.dueDate ? (
                          <div className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            {isOverdue && (
                              <span className="text-[10px] font-bold uppercase bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs">No date</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        <div
                          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
                          title={lastUp.toLocaleString()}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatRelativeTime(lastUp)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, Sun, Moon, Menu, Layers, X, CheckSquare, Clock, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface NavbarProps {
  toggleSidebar: () => void;
}

const statusColors: Record<string, string> = {
  ToDo: 'bg-gray-400', InProgress: 'bg-blue-500', Testing: 'bg-orange-500', Done: 'bg-green-500',
};

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Search state ───────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<{ tasks: any[]; projects: any[] }>({ tasks: [], projects: [] });
  const [isSearchOpen,  setIsSearchOpen]  = useState(false);
  const [isSearching,   setIsSearching]   = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notification state ─────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen,   setIsNotifOpen]   = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Fetch notifications ────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/notifications');
      setNotifications(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Debounced search ───────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults({ tasks: [], projects: [] });
      setIsSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await apiClient.get(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(data);
        setIsSearchOpen(true);
      } catch { /* silent */ } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  // ── Click outside to close ─────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchSelect = (type: 'task' | 'project', item: any) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    if (type === 'task')    navigate(`/projects/${item.projectId}?openTask=${item.id}`);
    if (type === 'project') navigate(`/projects/${item.id}`);
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const markOneRead = async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const handleNotifClick = (notif: any) => {
    markOneRead(notif.id);
    setIsNotifOpen(false);
    if (notif.task) navigate(`/projects/${notif.task.projectId}?openTask=${notif.task.id}`);
  };

  const formatNotifTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 transition-colors duration-300">

      <div className="flex items-center flex-1">
        {/* Mobile Hamburger */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 mr-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="hidden sm:block relative w-64 md:w-96">
          <div className="flex items-center bg-gray-100 dark:bg-[#121212] rounded-full px-4 py-2 border border-transparent dark:border-white/5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
            {isSearching
              ? <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shrink-0" />
              : <Search className="w-4 h-4 text-gray-500 shrink-0" />
            }
            <input
              type="text"
              placeholder="Search tasks, projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && (setSearchQuery(''), setIsSearchOpen(false))}
              className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white ml-3 w-full placeholder-gray-500"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {isSearchOpen && (searchResults.tasks.length > 0 || searchResults.projects.length > 0) && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden z-50">
              {searchResults.projects.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Projects</p>
                  {searchResults.projects.map((proj: any) => (
                    <button
                      key={proj.id}
                      onClick={() => handleSearchSelect('project', proj)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{proj.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.tasks.length > 0 && (
                <div className={searchResults.projects.length > 0 ? 'border-t border-gray-100 dark:border-white/5' : ''}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</p>
                  {searchResults.tasks.map((task: any) => (
                    <button
                      key={task.id}
                      onClick={() => handleSearchSelect('task', task)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${statusColors[task.status] || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 truncate">{task.project?.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 text-center">
                <p className="text-xs text-gray-400">Press Esc to close</p>
              </div>
            </div>
          )}

          {/* No results */}
          {isSearchOpen && !isSearching && searchResults.tasks.length === 0 && searchResults.projects.length === 0 && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 text-center z-50">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1 md:space-x-2">
        {/* Mobile search icon */}
        <button className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Help */}
        <Link
          to="/help"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
          title="คู่มือการใช้งาน"
        >
          <HelpCircle className="w-5 h-5" />
        </Link>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotifOpen(p => !p)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white dark:border-[#0a0a0a] flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left border-b border-gray-50 dark:border-white/5 last:border-0 ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1 mb-0.5">
                        {notif.type === 'assigned'
                          ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          : <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        }
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{notif.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-400">{formatNotifTime(notif.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="h-8 w-8 ml-1 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px] cursor-pointer hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all shrink-0">
          <img
            src={user?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=NBU"}
            alt="Avatar"
            title={user?.displayName || "User"}
            className="rounded-full w-full h-full object-cover bg-white dark:bg-[#121212]"
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;

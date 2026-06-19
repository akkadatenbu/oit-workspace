import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    tasksDueSoon: 0,
    completedTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await apiClient.get('/dashboard/metrics');
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome back, {user?.displayName || 'NBU IT Team'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">Here's a quick overview of your workspace today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-6 hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-blue-500/5 dark:text-white/5 group-hover:scale-110 transition-transform">
            <LayoutDashboard className="w-32 h-32" />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Active Projects</p>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{metrics.activeProjects}</p>
        </div>
        
        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-6 hover:border-orange-400 dark:hover:border-orange-500/50 transition-colors shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-orange-500/5 dark:text-white/5 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-32 h-32" />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Tasks Due Soon</p>
          </div>
          <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{metrics.tasksDueSoon}</p>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-6 hover:border-green-400 dark:hover:border-green-500/50 transition-colors shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-green-500/5 dark:text-white/5 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-32 h-32" />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 bg-green-100 dark:bg-green-500/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Completed Tasks</p>
          </div>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">{metrics.completedTasks}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-80 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Activity feed coming soon...</p>
          </div>
        </div>
        <div className="h-80 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Productivity Chart</h3>
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Charts integration coming soon...</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Dashboard;

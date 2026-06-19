import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import MyTasks from './pages/MyTasks';
import ConfirmInvitation from './pages/ConfirmInvitation';
import AdminPanel from './pages/AdminPanel';
import Members from './pages/Members';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // หลัง login สำเร็จ ตรวจสอบ pendingRedirect (เช่น confirm invitation)
  useEffect(() => {
    if (!loading && user) {
      const pending = localStorage.getItem('pendingRedirect');
      if (pending) {
        localStorage.removeItem('pendingRedirect');
        navigate(pending, { replace: true });
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center">
           <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
           <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium tracking-wider animate-pulse">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/confirm-invitation/:token" element={<ConfirmInvitation />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects/:id" element={<ProjectView />} />
              <Route path="tasks" element={<MyTasks />} />
              <Route path="admin" element={<AdminPanel />} />
              <Route path="members" element={<Members />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import MyTasks from './pages/MyTasks';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

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
            
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects/:id" element={<ProjectView />} />
              <Route path="tasks" element={<MyTasks />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

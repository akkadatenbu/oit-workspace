import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden text-gray-900 dark:text-gray-200 transition-colors duration-300">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

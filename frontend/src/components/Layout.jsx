import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gov-navy text-slate-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Navbar */}
        <Navbar toggleSidebar={toggleSidebar} />

        {/* Content area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Overlay to close sidebar on mobile */}
          {sidebarOpen && (
            <div 
              onClick={toggleSidebar} 
              className="fixed inset-0 z-30 bg-black/60 md:hidden"
            ></div>
          )}
          
          {/* Outlet for nested pages */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

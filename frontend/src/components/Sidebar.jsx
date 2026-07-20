import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  UploadCloud,
  AlertTriangle, 
  ShieldAlert, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  ShieldCheck 
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Financial Records', path: '/records', icon: FileSpreadsheet },
    { name: 'Record Ingestion', path: '/upload', icon: UploadCloud },
    { name: 'Fraud Alerts', path: '/alerts', icon: AlertTriangle },
    { name: 'Investigations', path: '/investigations', icon: ShieldAlert },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 border-r border-gov-blue/20 bg-gov-slate/95 transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gov-blue/20">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-gov-accent/15 border border-gov-accent/30 text-gov-accent">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-200 uppercase">
              AI INTEGRITY
            </h1>
            <p className="text-[10px] text-gov-gold uppercase tracking-widest font-semibold">
              FRAUD PLATFORM
            </p>
          </div>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="p-1 rounded hover:bg-gov-blue/20 text-slate-400 md:hidden"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center px-4 py-3 text-sm font-medium rounded transition-colors group ${
                  isActive 
                    ? 'bg-gov-accent/15 text-gov-accent border-l-4 border-gov-accent' 
                    : 'text-slate-400 hover:bg-gov-blue/10 hover:text-slate-200'
                }`
              }
            >
              <Icon size={18} className="mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* User Information Panel */}
      <div className="p-4 border-t border-gov-blue/20 bg-gov-navy/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gov-blue/40 text-gov-accent font-bold text-sm">
            {user?.username?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.username}</p>
            <p className="text-[10px] text-gov-gold font-medium truncate">{user?.role}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="flex items-center justify-center w-full px-4 py-2 text-xs font-medium text-slate-400 hover:text-gov-crimson hover:bg-gov-crimson/10 rounded transition-colors border border-slate-700/50 hover:border-gov-crimson/30"
        >
          <LogOut size={14} className="mr-2" />
          Logout System
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

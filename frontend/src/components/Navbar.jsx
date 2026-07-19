import React, { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Menu, Bell, Shield, CloudLightning } from 'lucide-react';
import axios from 'axios';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  // Derive page title from pathname
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'System Overview Dashboard';
      case '/records':
        return 'Financial Records Directory';
      case '/alerts':
        return 'AI Anomaly & Fraud Queue';
      case '/analytics':
        return 'Integrity Analytics & Reports';
      case '/settings':
        return 'Platform Settings';
      default:
        if (location.pathname.startsWith('/investigations/')) {
          return 'Case File Investigation';
        }
        if (location.pathname === '/investigations') {
          return 'Active Investigations';
        }
        return 'Government Integrity Desk';
    }
  };

  useEffect(() => {
    const fetchNewAlertCount = async () => {
      try {
        const res = await axios.get('/api/alerts?status=New');
        setAlertCount(res.data.length);
      } catch (err) {
        console.error('Failed to retrieve new alerts count', err);
      }
    };
    
    if (user) {
      fetchNewAlertCount();
      // Poll alerts every 45s for live dashboard feel
      const interval = setInterval(fetchNewAlertCount, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-gov-blue/20 bg-gov-slate/90 backdrop-blur-md">
      
      {/* Left side: Hamburger and Title */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleSidebar} 
          className="p-1 text-slate-400 rounded hover:bg-gov-blue/20 focus:outline-none md:hidden"
        >
          <Menu size={22} />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-200 tracking-wide uppercase">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      {/* Right side: Indicators, Bell, User */}
      <div className="flex items-center space-x-4">
        {/* Security Connection Badge */}
        <div className="hidden lg:flex items-center px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Shield size={12} className="mr-1.5 animate-pulse" />
          SECURE GOV LINK
        </div>

        {/* Sync Indicator */}
        <div className="hidden sm:flex items-center text-xs text-slate-400 space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span>DB SYNCED</span>
        </div>

        {/* Alerts Bell */}
        <div className="relative">
          <button className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-gov-blue/15 transition-colors">
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-gov-crimson text-[9px] font-extrabold text-white animate-bounce">
                {alertCount}
              </span>
            )}
          </button>
        </div>

        {/* Vertical divider */}
        <span className="h-6 w-px bg-gov-blue/30"></span>

        {/* User Quick Info */}
        <div className="flex items-center space-x-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-300">{user?.username}</p>
            <p className="text-[10px] text-gov-gold uppercase tracking-wider font-semibold">
              {user?.role === 'Admin' ? 'SYS_ADMIN' : 'INVESTIGATOR'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

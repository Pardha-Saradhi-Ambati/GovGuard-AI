import React, { useContext, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Menu, Bell, Shield, CloudLightning, Check, Trash2 } from 'lucide-react';
import axios from 'axios';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Derive page title from pathname
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'System Overview Dashboard';
      case '/records':
        return 'Financial Records Directory';
      case '/upload':
        return 'Financial Record Ingestion';
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

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 15s for instant updates
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-gov-blue/15 transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-gov-crimson text-[9px] font-extrabold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-md border border-gov-blue/20 bg-gov-slate/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden text-xs max-h-[400px] flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gov-blue/20 bg-gov-navy/40">
                <span className="font-bold text-slate-200 tracking-wide uppercase">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="text-[10px] text-gov-gold hover:underline font-semibold"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-gov-blue/10">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No notifications available.
                  </div>
                ) : (
                  notifications.map((n) => {
                    let priorityColor = 'text-slate-400 bg-slate-500/10 border-slate-500/25';
                    if (n.priority === 'Critical') priorityColor = 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/25';
                    else if (n.priority === 'High') priorityColor = 'text-orange-400 bg-orange-500/10 border-orange-500/25';
                    else if (n.priority === 'Medium') priorityColor = 'text-gov-gold bg-gov-gold/10 border-gov-gold/25';

                    return (
                      <div key={n.id} className={`p-3 hover:bg-gov-blue/5 transition-colors relative ${!n.is_read ? 'bg-gov-blue/5' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${priorityColor}`}>
                            {n.priority}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-200 pr-10 mb-0.5">{n.title}</div>
                        <div className="text-slate-400 pr-10">{n.message}</div>

                        {/* Action buttons overlayed in top-right */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="p-1 rounded text-gov-accent hover:bg-gov-blue/20"
                              title="Mark as Read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="p-1 rounded text-gov-crimson hover:bg-gov-crimson/20"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
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

import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gov-navy">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gov-accent border-t-transparent"></div>
          <p className="text-slate-400 text-sm font-medium tracking-wider animate-pulse">
            AUTHENTICATING SECURE CONNECTION...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page and save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to main dashboard
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';
import api from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const AUTH_HEARTBEAT_MS = 60_000; // Check every 60 seconds

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  // Periodic auth heartbeat — if user is suspended, /api/auth/me returns 401
  // which triggers axios interceptor → automatic logout
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        await api.get('/auth/me');
      } catch {
        // 401 handled by axios interceptor which dispatches logout()
      }
    }, AUTH_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;


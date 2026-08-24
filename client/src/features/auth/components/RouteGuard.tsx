import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../api';
import { useAuth } from '../hooks';
import { FullScreenLoader } from './FullScreenLoader';

interface RouteGuardProps {
  roles?: UserRole[];
  children: ReactNode;
}

export function RouteGuard({ roles, children }: RouteGuardProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <FullScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

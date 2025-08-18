import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  roles?: string[];
}

const ProtectedRoute: React.FC<Props> = ({ roles }) => {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default ProtectedRoute;


import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

export const ProtectedRoute = ({ children, pharmacistOnly = false }) => {
  const { user, loading, isPharmacist } = useAuth();

  if (loading) return <LoadingSpinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (pharmacistOnly && !isPharmacist) return <Navigate to="/" replace />;

  return children;
};

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/shared-store';

export default function ProtectRouter() {
  const { getIsLogined } = useAuth();
  return getIsLogined() ? <Outlet /> : <Navigate to="/login" />;
}

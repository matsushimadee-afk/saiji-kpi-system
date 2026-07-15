import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@saiji/shared';
import { useAuthStore } from '@/store/authStore';

/** 役割ごとの初期遷移先 */
export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case 'sales':
      return '/sales';
    case 'manager':
    case 'admin':
      return '/dashboard';
    default:
      return '/sales';
  }
}

/** 指定ロールのみ許可。権限外はロール既定ページへリダイレクト。 */
export function RoleGate({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    return <Navigate to={defaultRouteForRole(user.role)} replace />;
  }
  return <Outlet />;
}

import { DASHBOARD_ROLES, MASTER_ROLES, type Role } from '@saiji/shared';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: Role[];
}

/** サイド/下部ナビの定義。権限で表示を出し分ける。 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/sales', label: '入力', icon: '➕', roles: ['sales', 'leader', 'manager', 'admin'] },
  { to: '/dashboard', label: 'ダッシュボード', icon: '📊', roles: DASHBOARD_ROLES },
  { to: '/masters', label: 'マスタ管理', icon: '⚙️', roles: MASTER_ROLES },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

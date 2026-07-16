import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cx } from '@/lib/cx';
import styles from './Masters.module.css';

interface SubNavItem {
  to: string;
  label: string;
  /** 管理者のみに表示 (取り返しのつかない操作) */
  adminOnly?: boolean;
}

const SUB_NAV: SubNavItem[] = [
  { to: 'users', label: '営業担当' },
  { to: 'kpis', label: 'KPI' },
  { to: 'rates', label: '転換率' },
  { to: 'venues', label: '会場' },
  { to: 'org', label: '部署・チーム' },
  { to: 'targets', label: '目標' },
  { to: 'data', label: 'データ管理', adminOnly: true },
];

export function MastersLayout() {
  const role = useAuthStore((s) => s.user?.role);
  const items = SUB_NAV.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <div className={styles.page + ' fade-in'}>
      <div className={styles.title}>マスタ管理</div>
      <nav className={styles.subnav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cx(styles.subnavLink, isActive && styles.subnavActive)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

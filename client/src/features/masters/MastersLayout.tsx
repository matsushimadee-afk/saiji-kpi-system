import { NavLink, Outlet } from 'react-router-dom';
import { cx } from '@/lib/cx';
import styles from './Masters.module.css';

const SUB_NAV = [
  { to: 'users', label: '営業担当' },
  { to: 'kpis', label: 'KPI' },
  { to: 'rates', label: '転換率' },
  { to: 'venues', label: '会場' },
  { to: 'org', label: '部署・チーム' },
  { to: 'targets', label: '目標' },
];

export function MastersLayout() {
  return (
    <div className={styles.page + ' fade-in'}>
      <div className={styles.title}>マスタ管理</div>
      <nav className={styles.subnav}>
        {SUB_NAV.map((item) => (
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

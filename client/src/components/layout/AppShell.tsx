import { NavLink, Outlet } from 'react-router-dom';
import { ROLE_LABELS } from '@saiji/shared';
import { useAuthStore } from '@/store/authStore';
import { refreshSocketAuth } from '@/realtime/socket';
import { Button } from '@/components/ui';
import { cx } from '@/lib/cx';
import { ThemeToggle } from './ThemeToggle';
import { navItemsForRole } from './navItems';
import styles from './AppShell.module.css';

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  if (!user) return null;

  const items = navItemsForRole(user.role);

  const handleLogout = () => {
    logout();
    refreshSocketAuth();
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>KPI</span>
          <span>催事KPI</span>
        </div>

        <nav className={styles.topNav}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cx(styles.navLink, isActive && styles.navLinkActive)}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.right}>
          <div className={styles.userChip}>
            <span className={styles.userName}>{user.displayName}</span>
            <span className={styles.userRole}>
              {ROLE_LABELS[user.role]}
              {user.departmentName ? ` / ${user.departmentName}` : ''}
            </span>
          </div>
          <ThemeToggle />
          <Button variant="subtle" size="sm" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>

      {/* モバイル下部ナビ */}
      <nav className={styles.bottomNav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cx(styles.bottomLink, isActive && styles.bottomLinkActive)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import type { ReactNode } from 'react';

/** ローディング表示 */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="stack stack-3 center" style={{ alignItems: 'center', padding: 'var(--space-8) 0' }}>
      <div className="spinner" />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

/** 空状態 */
export function EmptyState({ icon = '📭', message }: { icon?: string; message: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div>{message}</div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'brand';

export function Badge({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('badge', tone !== 'default' && `badge--${tone}`)}>{children}</span>;
}

/** 達成率に応じたトーンのバッジ */
export function RateBadge({ rate }: { rate: number }) {
  const tone: Tone = rate >= 100 ? 'success' : rate >= 60 ? 'warning' : 'danger';
  return <Badge tone={tone}>{rate}%</Badge>;
}

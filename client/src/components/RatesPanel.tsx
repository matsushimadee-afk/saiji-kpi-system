import type { RateResult } from '@saiji/shared';
import { Card, EmptyState } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import styles from './RatesPanel.module.css';

/** 転換率（数値項目）を一覧表示する。営業画面・ダッシュボード共通。 */
export function RatesPanel({ rates, title = '転換率' }: { rates: RateResult[]; title?: string }) {
  return (
    <Card title={title}>
      {rates.length === 0 ? (
        <EmptyState message="転換率が未設定です" />
      ) : (
        <div className={styles.grid}>
          {rates.map((r) => (
            <div className={styles.item} key={r.id}>
              <span className={styles.name}>{r.name}</span>
              <span className={`${styles.rate} tabular`}>{r.rate}%</span>
              <span className={`${styles.detail} tabular`}>
                {formatNumber(r.numeratorCount)} / {formatNumber(r.denominatorCount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

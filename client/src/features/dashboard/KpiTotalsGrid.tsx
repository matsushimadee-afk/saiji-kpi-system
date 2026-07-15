import type { KpiTotal } from '@saiji/shared';
import { ProgressBar, RateBadge } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import styles from './Dashboard.module.css';

/** KPI 別合計 + 達成率 + 進捗バーのカード群 (デイリー/当月共通) */
export function KpiTotalsGrid({ totals }: { totals: KpiTotal[] }) {
  return (
    <div className={styles.totals}>
      {totals.map((t) => {
        const color = t.color ?? 'var(--brand)';
        return (
          <div className={styles.stat} key={t.kpiId}>
            <div className={styles.statHead}>
              <div className={styles.statName}>
                <span className={styles.dot} style={{ background: color }} />
                {t.name}
              </div>
              {t.target > 0 && <RateBadge rate={t.achievementRate} />}
            </div>
            <div>
              <div className={`${styles.statCount} tabular`}>{formatNumber(t.count)}</div>
              {t.target > 0 && <div className={styles.statTarget}>目標 {formatNumber(t.target)}</div>}
            </div>
            <ProgressBar rate={t.achievementRate} color={color} />
          </div>
        );
      })}
    </div>
  );
}

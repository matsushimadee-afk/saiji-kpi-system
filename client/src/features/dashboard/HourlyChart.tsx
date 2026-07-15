import type { HourlyPoint } from '@saiji/shared';
import { Card, EmptyState } from '@/components/ui';
import styles from './Dashboard.module.css';

/** 時間帯別の総件数バーチャート */
export function HourlyChart({ points }: { points: HourlyPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.total));

  return (
    <Card title="時間帯別推移">
      {points.length === 0 ? (
        <EmptyState message="本日の入力はまだありません" />
      ) : (
        <div className={styles.chart}>
          <div className={styles.bars}>
            {points.map((p) => (
              <div className={styles.barCol} key={p.hour} title={`${p.hour}時台: ${p.total}件`}>
                <span className={styles.barValue}>{p.total > 0 ? p.total : ''}</span>
                <div className={styles.bar} style={{ height: `${(p.total / max) * 100}%` }} />
                <span className={styles.barLabel}>{p.hour}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

import { useState } from 'react';
import type { KpiSummaryItem } from '@saiji/shared';
import { ProgressBar, RateBadge } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { cx } from '@/lib/cx';
import styles from './SalesPage.module.css';

interface Props {
  item: KpiSummaryItem;
  onAdd: (kpiId: number) => void;
}

/** 大きな 1 タップ KPI ボタン (現在件数・目標・達成率・進捗バー付き) */
export function KpiButtonCard({ item, onAdd }: Props) {
  const [bump, setBump] = useState(false);
  const color = item.color ?? 'var(--brand)';

  const handle = () => {
    setBump(true);
    onAdd(item.kpiId);
    window.setTimeout(() => setBump(false), 450);
  };

  return (
    <div className={styles.kpi}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiHead}>
          <div className={styles.kpiName}>
            <span className={styles.dot} style={{ background: color }} />
            {item.name}
          </div>
          {item.target > 0 && <RateBadge rate={item.achievementRate} />}
        </div>
        <div className={styles.counts}>
          {/* count をキーにすることで +1 のたびにポップ演出を再生 */}
          <span key={item.count} className={cx(styles.count, 'tabular', 'pop')}>
            {formatNumber(item.count)}
          </span>
          <span className={styles.target}>
            件{item.target > 0 && ` / 目標 ${formatNumber(item.target)}`}
          </span>
        </div>
        <ProgressBar rate={item.achievementRate} color={color} />
      </div>

      <button
        className={cx(styles.addBtn, bump && 'flash')}
        style={{ background: color, ['--flash-color' as string]: color }}
        onClick={handle}
        aria-label={`${item.name}を1件追加`}
      >
        <span className={styles.plus}>＋</span>
        {item.name}
      </button>
    </div>
  );
}

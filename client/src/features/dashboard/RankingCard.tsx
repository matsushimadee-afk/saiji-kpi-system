import type { RankingRow } from '@saiji/shared';
import { Card, EmptyState } from '@/components/ui';
import { formatNumber, medal } from '@/lib/format';
import styles from './Dashboard.module.css';

interface KpiMeta {
  code: string;
  name: string;
}

interface Props {
  title: string;
  rows: RankingRow[];
  kpis: KpiMeta[];
  primaryKpiCode: string | null;
  limit?: number;
}

/** 汎用ランキング表示 (営業別/会場別/部署別 で再利用) */
export function RankingCard({ title, rows, kpis, primaryKpiCode, limit = 10 }: Props) {
  const primaryName = kpis.find((k) => k.code === primaryKpiCode)?.name ?? '';
  const shown = rows.slice(0, limit);

  return (
    <Card
      title={title}
      action={primaryName ? <span className="faint" style={{ fontSize: '0.75rem' }}>{primaryName}順</span> : undefined}
    >
      {shown.length === 0 ? (
        <EmptyState message="データがありません" />
      ) : (
        <div className={styles.rankList}>
          {shown.map((r, i) => (
            <div className={styles.rankRow} key={r.id}>
              <div className={styles.rank}>{medal(i) || i + 1}</div>
              <div className={styles.rankMain}>
                <div className={styles.rankLabel}>{r.label}</div>
                {r.sublabel && <div className={styles.rankSub}>{r.sublabel}</div>}
                <div className={styles.rankChips}>
                  {kpis
                    .filter((k) => k.code !== primaryKpiCode && r.counts[k.code] !== undefined)
                    .map((k) => (
                      <span className={styles.chip} key={k.code}>
                        {k.name} {formatNumber(r.counts[k.code] ?? 0)}
                      </span>
                    ))}
                </div>
              </div>
              <div className={`${styles.rankPrimary} tabular`}>{formatNumber(r.primaryCount)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

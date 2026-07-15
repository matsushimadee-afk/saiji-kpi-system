import { statsApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui';
import { RatesPanel } from '@/components/RatesPanel';
import { KpiTotalsGrid } from './KpiTotalsGrid';
import { RankingCard } from './RankingCard';
import { useLiveStats } from './useLiveStats';
import styles from './Dashboard.module.css';

export function MonthlyTab({ month }: { month: string }) {
  const { data, loading } = useLiveStats(() => statsApi.monthly(month), [month]);

  if (loading && !data) return <Spinner label="集計中…" />;
  if (!data) return null;

  const kpis = data.totals.map((t) => ({ code: t.code, name: t.name }));

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <KpiTotalsGrid totals={data.totals} />
      <RatesPanel rates={data.rates} />
      <div className={styles.columns}>
        <RankingCard title="営業ランキング" rows={data.userRanking} kpis={kpis} primaryKpiCode={data.primaryKpiCode} />
        <RankingCard title="会場ランキング" rows={data.venueRanking} kpis={kpis} primaryKpiCode={data.primaryKpiCode} />
      </div>
      <RankingCard title="部署ランキング" rows={data.departmentRanking} kpis={kpis} primaryKpiCode={data.primaryKpiCode} />
    </div>
  );
}

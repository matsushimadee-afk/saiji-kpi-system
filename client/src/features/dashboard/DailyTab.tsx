import { statsApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui';
import { RatesPanel } from '@/components/RatesPanel';
import { KpiTotalsGrid } from './KpiTotalsGrid';
import { UserRatesTable } from './UserRatesTable';
import { RankingCard } from './RankingCard';
import { HourlyChart } from './HourlyChart';
import { useLiveStats } from './useLiveStats';

export function DailyTab({ date }: { date: string }) {
  const { data, loading } = useLiveStats(() => statsApi.daily(date), [date]);

  if (loading && !data) return <Spinner label="集計中…" />;
  if (!data) return null;

  const kpis = data.totals.map((t) => ({ code: t.code, name: t.name }));

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <KpiTotalsGrid totals={data.totals} />
      <RatesPanel rates={data.rates} title="転換率（全体）" />
      <UserRatesTable rows={data.userRanking} />
      <HourlyChart points={data.hourly} />
      <RankingCard title="営業別ランキング" rows={data.userRanking} kpis={kpis} primaryKpiCode={data.primaryKpiCode} />
    </div>
  );
}

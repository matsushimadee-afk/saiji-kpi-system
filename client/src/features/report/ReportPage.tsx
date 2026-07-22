import { useCallback, useEffect, useMemo, useState } from 'react';
import { DASHBOARD_ROLES, type TrendResponse, type TrendScope, type User } from '@saiji/shared';
import { statsApi, userApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { Card, Input, Select, Spinner, Tabs } from '@/components/ui';
import { RatesPanel } from '@/components/RatesPanel';
import { LineChart } from '@/components/LineChart';
import { currentMonthStr, formatNumber, todayStr } from '@/lib/format';
import { cx } from '@/lib/cx';
import styles from './Report.module.css';

/** YYYY-MM-DD → MM/DD */
function shortDate(d: string): string {
  return d.slice(5).replace('-', '/');
}

export function ReportPage() {
  const user = useAuthStore((s) => s.user)!;
  const canChooseScope = DASHBOARD_ROLES.includes(user.role);

  const [scope, setScope] = useState<TrendScope>('self');
  const [userId, setUserId] = useState<number | ''>('');
  const [from, setFrom] = useState(`${currentMonthStr()}-01`);
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  // 担当者選択用の一覧（リーダー・責任者以上）
  useEffect(() => {
    if (!canChooseScope) return;
    void userApi.list({ status: 'active' }).then(setMembers);
  }, [canChooseScope]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from, to, scope, userId: scope === 'user' && userId ? Number(userId) : undefined };
      const res = await statsApi.trend(params);
      setData(res);
      setSelectedKpi((prev) => prev ?? res.kpis[0]?.code ?? null);
    } finally {
      setLoading(false);
    }
  }, [from, to, scope, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartPoints = useMemo(() => {
    if (!data || !selectedKpi) return [];
    return data.points.map((p) => ({ label: shortDate(p.date), value: p.counts[selectedKpi] ?? 0 }));
  }, [data, selectedKpi]);

  const selectedKpiMeta = data?.kpis.find((k) => k.code === selectedKpi) ?? null;

  return (
    <div className={styles.page + ' fade-in'}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>分析</div>
          <div className={styles.scope}>
            対象: {data?.scopeLabel ?? '—'} ／ 稼働 {data?.activeDays ?? 0} 日
          </div>
        </div>
        <div className={styles.controls}>
          {canChooseScope && (
            <Tabs
              items={[
                { value: 'self', label: '自分' },
                { value: 'all', label: '全体' },
                { value: 'user', label: '担当者別' },
              ]}
              value={scope}
              onChange={(v) => setScope(v as TrendScope)}
            />
          )}
          {canChooseScope && scope === 'user' && (
            <Select value={userId} onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')} style={{ width: 'auto', height: 38 }}>
              <option value="">担当者を選択</option>
              {members
                .filter((m) => m.role === 'sales' || m.role === 'leader')
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </Select>
          )}
          <div className={styles.dates}>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ width: 'auto', height: 38 }} />
            <span>〜</span>
            <Input type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)} style={{ width: 'auto', height: 38 }} />
          </div>
        </div>
      </div>

      {loading && !data ? (
        <Spinner label="集計中…" />
      ) : !data ? null : (
        <>
          {/* KPIごとの分析（合計・1日平均・ピーク）。タップでグラフ切替 */}
          <div className={styles.grid}>
            {data.kpis.map((k) => {
              const total = data.totals[k.code] ?? 0;
              const avg = data.activeDays > 0 ? Math.round(total / data.activeDays) : 0;
              const peak = Math.max(0, ...data.points.map((p) => p.counts[k.code] ?? 0));
              const color = k.color ?? 'var(--brand)';
              return (
                <button
                  key={k.id}
                  type="button"
                  className={cx(styles.stat, selectedKpi === k.code && styles.statSelected)}
                  onClick={() => setSelectedKpi(k.code)}
                >
                  <div className={styles.statHead}>
                    <span className={styles.dot} style={{ background: color }} />
                    {k.name}
                  </div>
                  <div className={`${styles.statTotal} tabular`}>{formatNumber(total)}</div>
                  <div className={styles.statSub}>1日平均 {formatNumber(avg)} ／ ピーク {formatNumber(peak)}</div>
                </button>
              );
            })}
          </div>

          {/* 選択したKPIの推移グラフ */}
          <Card
            title={selectedKpiMeta ? `${selectedKpiMeta.name} の推移` : '推移'}
            action={<span className={styles.chartHint}>上のカードをタップで切替</span>}
          >
            <LineChart points={chartPoints} color={selectedKpiMeta?.color ?? 'var(--brand)'} />
          </Card>

          {/* 期間の転換率 */}
          <RatesPanel rates={data.rates} title="転換率（期間合計）" />
        </>
      )}
    </div>
  );
}

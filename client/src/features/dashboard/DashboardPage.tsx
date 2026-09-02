import { useState } from 'react';
import { Button, Input, Tabs, useToast } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { statsApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { currentMonthStr, todayStr } from '@/lib/format';
import { monthStartEnd } from '@/lib/dateRange';
import { DailyTab } from './DailyTab';
import { MonthlyTab } from './MonthlyTab';
import styles from './Dashboard.module.css';

type TabKey = 'daily' | 'monthly';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('daily');
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(currentMonthStr());
  const [exporting, setExporting] = useState<'kpi' | 'venueSummary' | 'venueDetail' | null>(null);

  const scopeLabel = user.role === 'admin' ? '全社' : user.departmentName ?? '自部署';

  const currentRange = () => (tab === 'daily' ? { from: date, to: date } : monthStartEnd(month));

  // 表示中の期間を CSV 出力する（デイリー=その日 / 当月=月初〜月末）
  const exportCsv = async () => {
    setExporting('kpi');
    try {
      await statsApi.downloadCsv(currentRange());
    } catch (err) {
      toast.error(getErrorMessage(err, 'CSV出力に失敗しました'));
    } finally {
      setExporting(null);
    }
  };

  // 場所代CSV（担当者ごと合計 / 日別明細）を出力する
  const exportVenueCost = async (kind: 'venueSummary' | 'venueDetail') => {
    setExporting(kind);
    try {
      if (kind === 'venueSummary') await statsApi.downloadVenueCostSummaryCsv(currentRange());
      else await statsApi.downloadVenueCostDetailCsv(currentRange());
    } catch (err) {
      toast.error(getErrorMessage(err, '場所代CSVの出力に失敗しました'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={styles.page + ' fade-in'}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>ダッシュボード</div>
          <div className={styles.scope}>
            集計範囲: {scopeLabel}
            <span className={styles.live} style={{ marginLeft: 10 }}>
              <span className={styles.liveDot} />
              リアルタイム更新中
            </span>
          </div>
        </div>
        <div className={styles.controls}>
          <Tabs
            items={[
              { value: 'daily', label: 'デイリー' },
              { value: 'monthly', label: '当月' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as TabKey)}
          />
          {tab === 'daily' ? (
            <Input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value || todayStr())}
              style={{ width: 'auto', height: 38 }}
            />
          ) : (
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthStr())}
              style={{ width: 'auto', height: 38 }}
            />
          )}
          <Button variant="ghost" size="sm" onClick={exportCsv} disabled={exporting !== null}>
            {exporting === 'kpi' ? '出力中…' : '⬇ CSV出力'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportVenueCost('venueSummary')} disabled={exporting !== null}>
            {exporting === 'venueSummary' ? '出力中…' : '⬇ 場所代（担当別合計）'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportVenueCost('venueDetail')} disabled={exporting !== null}>
            {exporting === 'venueDetail' ? '出力中…' : '⬇ 場所代（日別明細）'}
          </Button>
        </div>
      </div>

      {tab === 'daily' ? <DailyTab date={date} /> : <MonthlyTab month={month} />}
    </div>
  );
}

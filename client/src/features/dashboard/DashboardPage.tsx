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
  const [exporting, setExporting] = useState(false);

  const scopeLabel = user.role === 'admin' ? '全社' : user.departmentName ?? '自部署';

  // 表示中の期間を CSV 出力する（デイリー=その日 / 当月=月初〜月末）
  const exportCsv = async () => {
    setExporting(true);
    try {
      const range = tab === 'daily' ? { from: date, to: date } : monthStartEnd(month);
      await statsApi.downloadCsv(range);
    } catch (err) {
      toast.error(getErrorMessage(err, 'CSV出力に失敗しました'));
    } finally {
      setExporting(false);
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
          <Button variant="ghost" size="sm" onClick={exportCsv} disabled={exporting}>
            {exporting ? '出力中…' : '⬇ CSV出力'}
          </Button>
        </div>
      </div>

      {tab === 'daily' ? <DailyTab date={date} /> : <MonthlyTab month={month} />}
    </div>
  );
}

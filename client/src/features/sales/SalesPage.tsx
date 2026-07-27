import { useEffect, useState } from 'react';
import type { Venue } from '@saiji/shared';
import { authApi, kintoneApi, venueApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/api/client';
import { Button, Modal, Spinner, useToast } from '@/components/ui';
import { RatesPanel } from '@/components/RatesPanel';
import { KpiButtonCard } from './KpiButtonCard';
import { VenuePicker } from './VenuePicker';
import { useMySummary } from './useMySummary';
import styles from './SalesPage.module.css';

const VENUE_KEY = 'kpi_venue';

export function SalesPage() {
  const user = useAuthStore((s) => s.user)!;
  const toast = useToast();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<number | null>(() => {
    const saved = localStorage.getItem(VENUE_KEY);
    return saved ? Number(saved) : null;
  });

  const { data, loading, increment, undo } = useMySummary(venueId);
  const [kintoneEnabled, setKintoneEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [strategy, setStrategy] = useState('');
  const [roleplay, setRoleplay] = useState('');
  const [kpiThoughts, setKpiThoughts] = useState('');

  useEffect(() => {
    void venueApi.list(true).then(setVenues);
    void authApi.config().then((c) => setKintoneEnabled(c.kintoneEnabled)).catch(() => {});
  }, []);

  const submitReport = async () => {
    setSubmitting(true);
    try {
      await kintoneApi.submitDailyReport({ strategy, roleplay, kpiThoughts });
      setReportOpen(false);
      setStrategy('');
      setRoleplay('');
      setKpiThoughts('');
      toast.show('日報を提出しました ✅');
    } catch (err) {
      toast.error(getErrorMessage(err, '日報の提出に失敗しました'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVenue = (id: number | null) => {
    setVenueId(id);
    if (id) localStorage.setItem(VENUE_KEY, String(id));
    else localStorage.removeItem(VENUE_KEY);
  };

  const handleAdd = (kpiId: number) => {
    void increment(kpiId).catch((err) => toast.error(getErrorMessage(err, '登録に失敗しました')));
  };

  const handleUndo = () => {
    undo()
      .then(() => toast.show('直前の入力を取り消しました'))
      .catch((err) => toast.error(getErrorMessage(err, '取り消せませんでした')));
  };

  const dateLabel = new Date(data?.date ?? Date.now()).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className={styles.page + ' fade-in'}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.hello}>{user.displayName} さん</div>
          <div className={styles.date}>{dateLabel} の入力</div>
        </div>
        <VenuePicker venues={venues} value={venueId} onChange={handleVenue} />
      </div>

      {loading || !data ? (
        <Spinner label="読み込み中…" />
      ) : (
        <>
          <div className={styles.grid}>
            {data.items.map((item) => (
              <KpiButtonCard key={item.kpiId} item={item} onAdd={handleAdd} />
            ))}
          </div>
          {data.rates.length > 0 && <RatesPanel rates={data.rates} title="本日の転換率" />}
          {kintoneEnabled && (
            <Button variant="primary" block onClick={() => setReportOpen(true)} style={{ height: 52 }}>
              📝 日報を提出する
            </Button>
          )}
        </>
      )}

      <Modal
        open={reportOpen}
        title="日報を提出"
        onClose={() => (submitting ? undefined : setReportOpen(false))}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={submitting}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={submitReport} disabled={submitting}>
              {submitting ? '提出中…' : 'この内容で提出'}
            </Button>
          </>
        }
      >
        <p className={styles.reportLead}>
          本日の数値でキントーンに日報を作成します。下の記入欄はすべて任意です。
        </p>
        <div className={styles.reportFields}>
          <label className={styles.reportField}>
            <span className={styles.reportLabel}>今日の気付き・戦略</span>
            <textarea
              className={styles.reportComment}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="今日の気付き・戦略（任意）"
              rows={4}
              maxLength={2000}
              autoFocus
            />
          </label>
          <label className={styles.reportField}>
            <span className={styles.reportLabel}>ロープレに対しての気付き</span>
            <textarea
              className={styles.reportComment}
              value={roleplay}
              onChange={(e) => setRoleplay(e.target.value)}
              placeholder="ロープレの気付き（任意）"
              rows={3}
              maxLength={2000}
            />
          </label>
          <label className={styles.reportField}>
            <span className={styles.reportLabel}>KPIからの所感</span>
            <textarea
              className={styles.reportComment}
              value={kpiThoughts}
              onChange={(e) => setKpiThoughts(e.target.value)}
              placeholder="KPIを見ての所感（任意）"
              rows={3}
              maxLength={2000}
            />
          </label>
        </div>
      </Modal>

      {data?.canUndo && (
        <div className={styles.undoBar}>
          <Button variant="ghost" onClick={handleUndo}>
            ↩ 直前の入力を取り消す
          </Button>
        </div>
      )}
    </div>
  );
}

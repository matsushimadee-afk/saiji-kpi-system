import { useEffect, useState } from 'react';
import type { Venue } from '@saiji/shared';
import { authApi, kintoneApi, venueApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/api/client';
import { Button, Spinner, useToast } from '@/components/ui';
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

  useEffect(() => {
    void venueApi.list(true).then(setVenues);
    void authApi.config().then((c) => setKintoneEnabled(c.kintoneEnabled)).catch(() => {});
  }, []);

  const submitReport = async () => {
    if (!window.confirm('本日の数値で日報を提出します。\nキントーンの編集画面に移動するので、気付きを記入して保存してください。')) return;
    setSubmitting(true);
    try {
      const r = await kintoneApi.submitDailyReport();
      // キントーンの編集画面へ移動
      window.location.href = r.editUrl;
    } catch (err) {
      toast.error(getErrorMessage(err, '日報の提出に失敗しました'));
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
            <Button variant="primary" block onClick={submitReport} disabled={submitting} style={{ height: 52 }}>
              {submitting ? '提出中…' : '📝 日報を提出する'}
            </Button>
          )}
        </>
      )}

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

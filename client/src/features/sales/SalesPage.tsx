import { useEffect, useMemo, useState } from 'react';
import { DASHBOARD_ROLES, type DailyVenue, type Venue } from '@saiji/shared';
import { authApi, dailyVenueApi, kintoneApi, venueApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/api/client';
import { Button, Modal, Select, Spinner, useToast } from '@/components/ui';
import { RatesPanel } from '@/components/RatesPanel';
import { formatNumber } from '@/lib/format';
import { KpiButtonCard } from './KpiButtonCard';
import { DailyVenueManager } from './DailyVenueManager';
import { useMySummary } from './useMySummary';
import styles from './SalesPage.module.css';

export function SalesPage() {
  const user = useAuthStore((s) => s.user)!;
  const toast = useToast();
  const canManageVenue = DASHBOARD_ROLES.includes(user.role);

  const [todayVenues, setTodayVenues] = useState<DailyVenue[]>([]);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const { data, loading, increment, undo } = useMySummary(venueId);
  const [kintoneEnabled, setKintoneEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [strategy, setStrategy] = useState('');
  const [roleplay, setRoleplay] = useState('');
  const [kpiThoughts, setKpiThoughts] = useState('');

  const reloadDaily = () => {
    void dailyVenueApi.list().then(setTodayVenues);
  };

  useEffect(() => {
    reloadDaily();
    void authApi.config().then((c) => setKintoneEnabled(c.kintoneEnabled)).catch(() => {});
    if (canManageVenue) void venueApi.list(true).then(setAllVenues);
  }, [canManageVenue]);

  // 本日の会場に合わせて自分の会場を自動調整（1つなら自動選択、選択中が無ければ解除）
  useEffect(() => {
    setVenueId((prev) => {
      if (todayVenues.length === 1) return todayVenues[0].venueId;
      if (prev != null && todayVenues.some((v) => v.venueId === prev)) return prev;
      return null;
    });
  }, [todayVenues]);

  const selectedVenue = useMemo(
    () => todayVenues.find((v) => v.venueId === venueId) ?? null,
    [todayVenues, venueId],
  );

  const submitReport = async () => {
    setSubmitting(true);
    try {
      await kintoneApi.submitDailyReport({ notes: { strategy, roleplay, kpiThoughts } });
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

  const costText = (v: DailyVenue) => (v.cost != null ? `（${formatNumber(v.cost)}円）` : '');

  return (
    <div className={styles.page + ' fade-in'}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.hello}>{user.displayName} さん</div>
          <div className={styles.date}>{dateLabel} の入力</div>
        </div>
        <div className="row row-2">
          {/* 本日の会場 */}
          {todayVenues.length === 0 ? (
            <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>📍 本日の会場 未設定</span>
          ) : todayVenues.length === 1 ? (
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              📍 {todayVenues[0].venueName}
              <span className="faint" style={{ fontWeight: 600 }}> {costText(todayVenues[0])}</span>
            </span>
          ) : (
            <Select
              value={venueId ?? ''}
              onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: 'auto', minWidth: 150, height: 38 }}
            >
              <option value="">会場を選ぶ</option>
              {todayVenues.map((v) => (
                <option key={v.venueId} value={v.venueId}>
                  {v.venueName}
                  {costText(v)}
                </option>
              ))}
            </Select>
          )}
          {canManageVenue && (
            <Button variant="ghost" size="sm" onClick={() => setManagerOpen(true)}>⚙ 会場設定</Button>
          )}
        </div>
      </div>

      {/* 会場が複数あるのに未選択のときの案内 */}
      {todayVenues.length > 1 && venueId == null && (
        <div className="muted" style={{ fontSize: '0.85rem' }}>▲ 自分の会場を選んでからカウントしてください</div>
      )}

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
          本日の数値でキントーンに日報を作成します（場所代は本日の会場設定から自動反映）。下の記入欄はすべて任意です。
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

      <DailyVenueManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        allVenues={allVenues}
        current={todayVenues}
        onChanged={reloadDaily}
      />

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

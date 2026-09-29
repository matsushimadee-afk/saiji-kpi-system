import { useCallback, useEffect, useState } from 'react';
import type { DateAttendance, Venue } from '@saiji/shared';
import { attendanceApi, dailyVenueApi, venueApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Input, Select, Spinner, useToast } from '@/components/ui';
import { formatNumber, todayStr } from '@/lib/format';
import styles from './Masters.module.css';

/**
 * 場所代修正（責任者・リーダー・管理者）。
 * 日付を選び、その日の会場ごとに「いた人」をチェックで足し引きする。
 * KPI入力済みの人は「入力」バッジ付きで外せない。手動で追加した人は外せる。
 * チェックした人が場所代の頭割り対象になる。
 */
export function AttendanceEditor() {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<DateAttendance | null>(null);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // 会場追加フォーム
  const [addVenueId, setAddVenueId] = useState<number | ''>('');
  const [addCost, setAddCost] = useState('');
  // 場所代の編集ドラフト（会場ID→文字列）
  const [costDrafts, setCostDrafts] = useState<Record<number, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await attendanceApi.byDate(date));
    } catch (err) {
      toast.error(getErrorMessage(err, '読み込みに失敗しました'));
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    void venueApi.list(true).then(setAllVenues).catch(() => {});
  }, []);

  const toggle = async (venueId: number, userId: number, currentlyChecked: boolean) => {
    setBusy(true);
    try {
      if (currentlyChecked) await attendanceApi.remove(date, venueId, userId);
      else await attendanceApi.add(date, venueId, userId);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addVenue = async () => {
    if (!addVenueId) return;
    setBusy(true);
    try {
      await dailyVenueApi.set(Number(addVenueId), addCost === '' ? null : Number(addCost), date);
      setAddVenueId('');
      setAddCost('');
      await reload();
      toast.success('会場を追加しました');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveCost = async (venueId: number) => {
    const draft = costDrafts[venueId];
    if (draft === undefined) return;
    setBusy(true);
    try {
      await dailyVenueApi.set(venueId, draft === '' ? null : Number(draft), date);
      setCostDrafts((d) => {
        const next = { ...d };
        delete next[venueId];
        return next;
      });
      await reload();
      toast.success('場所代を保存しました');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onAddVenueSelect = (idStr: string) => {
    const id = idStr ? Number(idStr) : '';
    setAddVenueId(id);
    if (id) {
      const v = allVenues.find((x) => x.id === id);
      setAddCost(v?.cost != null ? String(v.cost) : '');
    } else setAddCost('');
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.toolbar}>
        <div className={styles.sectionTitle}>場所代修正（会場の出席）</div>
        <Input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())} style={{ width: 'auto', height: 38 }} />
      </div>

      <p className="muted" style={{ margin: 0, lineHeight: 1.7, fontSize: '0.88rem' }}>
        日付を選び、その日いた会場ごとに「いた人」をチェックしてください。チェックした人が<b>場所代の頭割り対象</b>になります。
        「入力」バッジはKPI入力済みで外せません。入力を忘れた人はチェックで追加できます。
      </p>

      {loading || !data ? (
        <Spinner label="読み込み中…" />
      ) : (
        <>
          {data.venues.length === 0 ? (
            <div className="muted" style={{ padding: 'var(--space-4) 0' }}>
              この日は会場が設定されていません。下の「会場を追加」から登録してください。
            </div>
          ) : (
            <div className="stack" style={{ gap: 'var(--space-4)' }}>
              {data.venues.map((v) => (
                <div key={v.venueId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                  <div className="row between wrap" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <b style={{ fontSize: '1rem' }}>{v.venueName}</b>
                    <div className="row row-2" style={{ alignItems: 'center' }}>
                      <span className="muted" style={{ fontSize: '0.85rem' }}>場所代</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={costDrafts[v.venueId] ?? (v.cost != null ? String(v.cost) : '')}
                        onChange={(e) => setCostDrafts((d) => ({ ...d, [v.venueId]: e.target.value }))}
                        style={{ width: 120, height: 34 }}
                        placeholder="場所代(円)"
                      />
                      <span className="muted" style={{ fontSize: '0.85rem' }}>円</span>
                      {costDrafts[v.venueId] !== undefined && (
                        <Button size="sm" variant="primary" onClick={() => saveCost(v.venueId)} disabled={busy}>保存</Button>
                      )}
                    </div>
                  </div>
                  <div className="row wrap" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                    {data.allMembers.map((m) => {
                      const mem = v.members.find((x) => x.userId === m.id);
                      const checked = !!mem;
                      const locked = mem?.source === 'kpi' || mem?.source === 'both';
                      return (
                        <label key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', opacity: locked ? 0.85 : 1 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy || locked}
                            onChange={() => toggle(v.venueId, m.id, checked)}
                          />
                          {m.name}
                          {locked && <span className="faint" style={{ fontSize: '0.72rem' }}>入力</span>}
                        </label>
                      );
                    })}
                  </div>
                  <div className="faint" style={{ fontSize: '0.78rem', marginTop: 6 }}>
                    出席 {v.members.length} 名{v.cost != null && v.members.length > 0 ? ` ／ 1人あたり ${formatNumber(Math.round(v.cost / v.members.length))}円` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 会場を追加 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
            <span className="field__label">この日に会場を追加（場所代の設定漏れもここで直せます）</span>
            <div className="row row-2 wrap" style={{ marginTop: 'var(--space-2)' }}>
              <Select value={addVenueId} onChange={(e) => onAddVenueSelect(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                <option value="">会場を選択</option>
                {allVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.cost != null ? `（基本${formatNumber(v.cost)}円）` : ''}
                  </option>
                ))}
              </Select>
              <Input type="number" inputMode="numeric" value={addCost} onChange={(e) => setAddCost(e.target.value)} placeholder="場所代(円)" style={{ width: 130 }} />
              <Button variant="primary" onClick={addVenue} disabled={busy || !addVenueId}>追加</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

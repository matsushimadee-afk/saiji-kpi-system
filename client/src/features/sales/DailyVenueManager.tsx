import { useState } from 'react';
import type { DailyVenue, Venue } from '@saiji/shared';
import { dailyVenueApi, venueApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { formatNumber } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  allVenues: Venue[];
  current: DailyVenue[];
  onChanged: () => void;
  /** 新しい会場を作成したら会場一覧を再読込するため */
  onVenuesChanged: () => void;
}

/** リーダー・責任者・管理者が「本日の会場＋場所代」を設定するモーダル */
export function DailyVenueManager({ open, onClose, allVenues, current, onChanged, onVenuesChanged }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<'select' | 'new'>('select');
  // 既存会場を選ぶ
  const [venueId, setVenueId] = useState<number | ''>('');
  const [cost, setCost] = useState('');
  // 新しい会場を作る
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newCost, setNewCost] = useState('');
  const [busy, setBusy] = useState(false);

  // 会場を選んだら、その会場の基本場所代を初期表示（当日だけ違う時は上書き可）
  const onSelectVenue = (idStr: string) => {
    const id = idStr ? Number(idStr) : '';
    setVenueId(id);
    if (id) {
      const v = allVenues.find((x) => x.id === id);
      setCost(v?.cost != null ? String(v.cost) : '');
    } else {
      setCost('');
    }
  };

  const addExisting = async () => {
    if (!venueId) return;
    setBusy(true);
    try {
      await dailyVenueApi.set(Number(venueId), cost === '' ? null : Number(cost));
      setVenueId('');
      setCost('');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addNew = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const costNum = newCost === '' ? null : Number(newCost);
      // 会場マスタに新規登録 → その会場を本日の会場にも追加
      const v = await venueApi.create({ name: newName.trim(), area: newArea.trim() || null, cost: costNum });
      await dailyVenueApi.set(v.id, costNum);
      setNewName('');
      setNewArea('');
      setNewCost('');
      setMode('select');
      onVenuesChanged(); // 会場一覧を更新
      onChanged(); // 本日の会場を更新
      toast.success('新しい会場を追加しました');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (vId: number) => {
    try {
      await dailyVenueApi.remove(vId);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal open={open} title="本日の会場を設定" onClose={onClose}>
      <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
        その日の会場と場所代を設定します。メンバーはここから会場を選んでカウントします（曜日で料金が変わるので日ごとに設定）。
      </p>

      {current.length === 0 ? (
        <div className="muted" style={{ padding: 'var(--space-3) 0' }}>まだ設定がありません</div>
      ) : (
        <div className="stack stack-2">
          {current.map((dv) => (
            <div
              key={dv.id}
              className="row between"
              style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}
            >
              <div>
                <b>{dv.venueName}</b>
                {dv.cost != null ? (
                  <span className="muted"> ／ 場所代 {formatNumber(dv.cost)}円</span>
                ) : (
                  <span className="faint"> ／ 場所代 未設定</span>
                )}
              </div>
              <Button size="sm" variant="subtle" onClick={() => remove(dv.venueId)}>削除</Button>
            </div>
          ))}
        </div>
      )}

      {mode === 'select' ? (
        <div className="stack stack-2" style={{ marginTop: 'var(--space-3)' }}>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="field__label">会場を追加（同じ会場を追加すると場所代を更新します）</span>
            <Button size="sm" variant="ghost" onClick={() => setMode('new')}>＋ 新しい会場</Button>
          </div>
          <div className="row row-2 wrap">
            <Select value={venueId} onChange={(e) => onSelectVenue(e.target.value)} style={{ flex: 1, minWidth: 150 }}>
              <option value="">会場を選択</option>
              {allVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.cost != null ? `（基本${formatNumber(v.cost)}円）` : ''}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="場所代(円)"
              style={{ width: 130 }}
            />
            <Button variant="primary" onClick={addExisting} disabled={busy || !venueId}>追加</Button>
          </div>
        </div>
      ) : (
        <div className="stack stack-2" style={{ marginTop: 'var(--space-3)' }}>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="field__label">新しい催事場を追加（会場マスタにも登録されます）</span>
            <Button size="sm" variant="ghost" onClick={() => setMode('select')}>← 一覧から選ぶ</Button>
          </div>
          <div className="stack stack-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="会場名（必須） 例: 新宿会場" />
            <div className="row row-2 wrap">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="エリア（任意） 例: 首都圏"
                style={{ flex: 1, minWidth: 150 }}
              />
              <Input
                type="number"
                inputMode="numeric"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="場所代(円)"
                style={{ width: 130 }}
              />
            </div>
            <Button variant="primary" onClick={addNew} disabled={busy || !newName.trim()}>作成して本日に追加</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

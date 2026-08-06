import { useState } from 'react';
import type { DailyVenue, Venue } from '@saiji/shared';
import { dailyVenueApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { formatNumber } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  allVenues: Venue[];
  current: DailyVenue[];
  onChanged: () => void;
}

/** リーダー・責任者・管理者が「本日の会場＋場所代」を設定するモーダル */
export function DailyVenueManager({ open, onClose, allVenues, current, onChanged }: Props) {
  const toast = useToast();
  const [venueId, setVenueId] = useState<number | ''>('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
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

      <div className="stack stack-2" style={{ marginTop: 'var(--space-3)' }}>
        <span className="field__label">会場を追加（同じ会場を追加すると場所代を更新します）</span>
        <div className="row row-2 wrap">
          <Select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : '')}
            style={{ flex: 1, minWidth: 150 }}
          >
            <option value="">会場を選択</option>
            {allVenues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
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
          <Button variant="primary" onClick={add} disabled={busy || !venueId}>追加</Button>
        </div>
      </div>
    </Modal>
  );
}

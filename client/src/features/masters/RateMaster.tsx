import { useCallback, useState } from 'react';
import type { Kpi, RateMetric } from '@saiji/shared';
import { kpiApi, rateApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Field, Input, Modal, Select, Spinner, Toggle, useToast } from '@/components/ui';
import { useList } from './useList';
import styles from './Masters.module.css';

type Draft = {
  name: string;
  numeratorKpiId: number | null;
  denominatorKpiId: number | null;
  displayOrder: number;
  isActive: boolean;
};

export function RateMaster() {
  const toast = useToast();
  const rates = useList<RateMetric>(useCallback(() => rateApi.list(true), []));
  const kpis = useList<Kpi>(useCallback(() => kpiApi.list(true), []));
  const [editing, setEditing] = useState<RateMetric | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', numeratorKpiId: null, denominatorKpiId: null, displayOrder: 0, isActive: true });
  const [saving, setSaving] = useState(false);

  const kpiName = (id: number | null) => kpis.items.find((k) => k.id === id)?.name ?? '—';

  const openNew = () => {
    setDraft({ name: '', numeratorKpiId: kpis.items[0]?.id ?? null, denominatorKpiId: kpis.items[0]?.id ?? null, displayOrder: rates.items.length + 1, isActive: true });
    setEditing('new');
  };
  const openEdit = (r: RateMetric) => {
    setDraft({ name: r.name, numeratorKpiId: r.numeratorKpiId, denominatorKpiId: r.denominatorKpiId, displayOrder: r.displayOrder, isActive: r.isActive });
    setEditing(r);
  };

  const save = async () => {
    if (draft.numeratorKpiId == null || draft.denominatorKpiId == null) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        numeratorKpiId: draft.numeratorKpiId,
        denominatorKpiId: draft.denominatorKpiId,
        displayOrder: draft.displayOrder,
        isActive: draft.isActive,
      };
      if (editing === 'new') await rateApi.create(payload);
      else if (editing) await rateApi.update(editing.id, payload);
      toast.success('保存しました');
      setEditing(null);
      await rates.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: RateMetric) => {
    if (!window.confirm(`転換率「${r.name}」を削除しますか？`)) return;
    try {
      await rateApi.remove(r.id);
      toast.success('削除しました');
      await rates.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.toolbar}>
        <div className={styles.sectionTitle}>転換率マスタ（数値項目）</div>
        <Button variant="primary" onClick={openNew} disabled={kpis.loading}>＋ 転換率追加</Button>
      </div>

      {rates.loading || kpis.loading ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>表示順</th><th>名称</th><th>計算式</th><th>状態</th><th></th></tr>
            </thead>
            <tbody>
              {rates.items.map((r) => (
                <tr key={r.id}>
                  <td className="tabular">{r.displayOrder}</td>
                  <td>{r.name}</td>
                  <td className="muted">{kpiName(r.numeratorKpiId)} ÷ {kpiName(r.denominatorKpiId)}</td>
                  <td>
                    <span className={r.isActive ? `${styles.tag} ${styles['tag--on']}` : `${styles.tag} ${styles['tag--off']}`}>
                      {r.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => remove(r)}>削除</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? '転換率を追加' : '転換率を編集'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>キャンセル</Button>
            <Button variant="primary" block onClick={save} disabled={saving || !draft.name || draft.numeratorKpiId == null || draft.denominatorKpiId == null}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Field label="名称">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例: 受注率" className="full" />
          </Field>
          <Field label="分子KPI">
            <Select value={draft.numeratorKpiId ?? ''} onChange={(e) => setDraft({ ...draft, numeratorKpiId: e.target.value ? Number(e.target.value) : null })}>
              {kpis.items.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </Select>
          </Field>
          <Field label="分母KPI">
            <Select value={draft.denominatorKpiId ?? ''} onChange={(e) => setDraft({ ...draft, denominatorKpiId: e.target.value ? Number(e.target.value) : null })}>
              {kpis.items.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </Select>
          </Field>
          <Field label="表示順">
            <Input type="number" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} />
          </Field>
          <div className="row row-3 full">
            <Toggle checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} aria-label="有効" />
            <span className="muted">有効にする</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

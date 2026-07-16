import { useCallback, useState } from 'react';
import type { Kpi } from '@saiji/shared';
import { kpiApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Field, Input, Modal, Spinner, Toggle, useToast } from '@/components/ui';
import { useList } from './useList';
import styles from './Masters.module.css';

type Draft = {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  color: string;
  isActive: boolean;
};

const emptyDraft = (order: number): Draft => ({
  code: '',
  name: '',
  description: '',
  displayOrder: order,
  color: '#3B82F6',
  isActive: true,
});

export function KpiMaster() {
  const toast = useToast();
  const { items, loading, reload } = useList<Kpi>(useCallback(() => kpiApi.list(true), []));
  const [editing, setEditing] = useState<Kpi | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(0));
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setDraft(emptyDraft(items.length + 1));
    setEditing('new');
  };
  const openEdit = (k: Kpi) => {
    setDraft({
      code: k.code,
      name: k.name,
      description: k.description ?? '',
      displayOrder: k.displayOrder,
      color: k.color ?? '#3B82F6',
      isActive: k.isActive,
    });
    setEditing(k);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...draft, description: draft.description || null };
      if (editing === 'new') await kpiApi.create(payload);
      else if (editing) await kpiApi.update(editing.id, payload);
      toast.success('保存しました');
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (k: Kpi) => {
    if (!window.confirm(`KPI「${k.name}」を削除しますか？\n関連する入力データも削除されます。`)) return;
    try {
      await kpiApi.remove(k.id);
      toast.success('削除しました');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.toolbar}>
        <div className={styles.sectionTitle}>KPIマスタ</div>
        <Button variant="primary" onClick={openNew}>＋ KPI追加</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>表示順</th>
                <th>コード</th>
                <th>名称</th>
                <th>色</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((k) => (
                <tr key={k.id}>
                  <td className="tabular">{k.displayOrder}</td>
                  <td><code>{k.code}</code></td>
                  <td>{k.name}</td>
                  <td><span className={styles.swatch} style={{ background: k.color ?? '#888' }} /></td>
                  <td>
                    <span className={k.isActive ? `${styles.tag} ${styles['tag--on']}` : `${styles.tag} ${styles['tag--off']}`}>
                      {k.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(k)}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => remove(k)}>削除</Button>
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
        title={editing === 'new' ? 'KPIを追加' : 'KPIを編集'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>キャンセル</Button>
            <Button variant="primary" block onClick={save} disabled={saving || !draft.name || !draft.code}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Field label="名称">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例: 声掛け" />
          </Field>
          <Field label="コード (英数字)">
            <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="例: call" />
          </Field>
          <Field label="説明（押すタイミング）">
            <Input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="例: お客様に声をかけたとき"
              className="full"
            />
          </Field>
          <Field label="表示順">
            <Input type="number" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} />
          </Field>
          <Field label="色">
            <Input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} style={{ padding: 4 }} />
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

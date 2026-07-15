import { useCallback, useState } from 'react';
import type { Venue } from '@saiji/shared';
import { venueApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Field, Input, Modal, Select, Spinner, useToast } from '@/components/ui';
import { useList } from './useList';
import styles from './Masters.module.css';

type Draft = { name: string; area: string; status: 'active' | 'inactive'; displayOrder: number };

const emptyDraft = (order: number): Draft => ({ name: '', area: '', status: 'active', displayOrder: order });

export function VenueMaster() {
  const toast = useToast();
  const { items, loading, reload } = useList<Venue>(useCallback(() => venueApi.list(false), []));
  const [editing, setEditing] = useState<Venue | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(0));
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setDraft(emptyDraft(items.length + 1));
    setEditing('new');
  };
  const openEdit = (v: Venue) => {
    setDraft({ name: v.name, area: v.area ?? '', status: v.status, displayOrder: v.displayOrder });
    setEditing(v);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...draft, area: draft.area || null };
      if (editing === 'new') await venueApi.create(payload);
      else if (editing) await venueApi.update(editing.id, payload);
      toast.success('保存しました');
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: Venue) => {
    if (!window.confirm(`会場「${v.name}」を削除しますか？`)) return;
    try {
      await venueApi.remove(v.id);
      toast.success('削除しました');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.toolbar}>
        <div className={styles.sectionTitle}>会場マスタ</div>
        <Button variant="primary" onClick={openNew}>＋ 会場追加</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>表示順</th>
                <th>会場名</th>
                <th>エリア</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id}>
                  <td className="tabular">{v.displayOrder}</td>
                  <td>{v.name}</td>
                  <td className="muted">{v.area ?? '—'}</td>
                  <td>
                    <span className={v.status === 'active' ? `${styles.tag} ${styles['tag--on']}` : `${styles.tag} ${styles['tag--off']}`}>
                      {v.status === 'active' ? '稼働' : '停止'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => remove(v)}>削除</Button>
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
        title={editing === 'new' ? '会場を追加' : '会場を編集'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>キャンセル</Button>
            <Button variant="primary" block onClick={save} disabled={saving || !draft.name}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Field label="会場名">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例: 新宿会場" />
          </Field>
          <Field label="エリア">
            <Input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="例: 首都圏" />
          </Field>
          <Field label="表示順">
            <Input type="number" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} />
          </Field>
          <Field label="状態">
            <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })}>
              <option value="active">稼働</option>
              <option value="inactive">停止</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

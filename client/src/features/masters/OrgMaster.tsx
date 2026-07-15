import { useCallback, useState } from 'react';
import type { Department, Team } from '@saiji/shared';
import { departmentApi, teamApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Field, Input, Modal, Select, Spinner, Toggle, useToast } from '@/components/ui';
import { useList } from './useList';
import styles from './Masters.module.css';

export function OrgMaster() {
  const toast = useToast();
  const depts = useList<Department>(useCallback(() => departmentApi.list(), []));
  const teams = useList<Team>(useCallback(() => teamApi.list(), []));

  const reloadAll = async () => {
    await Promise.all([depts.reload(), teams.reload()]);
  };

  // ---- 部署編集 ----
  const [deptEdit, setDeptEdit] = useState<Department | 'new' | null>(null);
  const [deptDraft, setDeptDraft] = useState({ name: '', displayOrder: 0, isActive: true });

  const saveDept = async () => {
    try {
      if (deptEdit === 'new') await departmentApi.create(deptDraft);
      else if (deptEdit) await departmentApi.update(deptEdit.id, deptDraft);
      toast.success('保存しました');
      setDeptEdit(null);
      await depts.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const removeDept = async (d: Department) => {
    if (!window.confirm(`部署「${d.name}」を削除しますか？`)) return;
    try {
      await departmentApi.remove(d.id);
      await reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ---- チーム編集 ----
  const [teamEdit, setTeamEdit] = useState<Team | 'new' | null>(null);
  const [teamDraft, setTeamDraft] = useState<{ name: string; departmentId: number | null; displayOrder: number; isActive: boolean }>({
    name: '',
    departmentId: null,
    displayOrder: 0,
    isActive: true,
  });

  const saveTeam = async () => {
    try {
      if (teamEdit === 'new') await teamApi.create(teamDraft);
      else if (teamEdit) await teamApi.update(teamEdit.id, teamDraft);
      toast.success('保存しました');
      setTeamEdit(null);
      await teams.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const removeTeam = async (t: Team) => {
    if (!window.confirm(`チーム「${t.name}」を削除しますか？`)) return;
    try {
      await teamApi.remove(t.id);
      await teams.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deptName = (id: number | null) => depts.items.find((d) => d.id === id)?.name ?? '—';

  return (
    <div className="stack" style={{ gap: 'var(--space-6)' }}>
      {/* 部署 */}
      <div className="stack" style={{ gap: 'var(--space-4)' }}>
        <div className={styles.toolbar}>
          <div className={styles.sectionTitle}>部署マスタ</div>
          <Button variant="primary" onClick={() => { setDeptDraft({ name: '', displayOrder: depts.items.length + 1, isActive: true }); setDeptEdit('new'); }}>
            ＋ 部署追加
          </Button>
        </div>
        {depts.loading ? <Spinner /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>表示順</th><th>部署名</th><th>状態</th><th></th></tr></thead>
              <tbody>
                {depts.items.map((d) => (
                  <tr key={d.id}>
                    <td className="tabular">{d.displayOrder}</td>
                    <td>{d.name}</td>
                    <td><span className={d.isActive ? `${styles.tag} ${styles['tag--on']}` : `${styles.tag} ${styles['tag--off']}`}>{d.isActive ? '有効' : '無効'}</span></td>
                    <td><div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => { setDeptDraft({ name: d.name, displayOrder: d.displayOrder, isActive: d.isActive }); setDeptEdit(d); }}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => removeDept(d)}>削除</Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* チーム */}
      <div className="stack" style={{ gap: 'var(--space-4)' }}>
        <div className={styles.toolbar}>
          <div className={styles.sectionTitle}>チームマスタ</div>
          <Button variant="primary" onClick={() => { setTeamDraft({ name: '', departmentId: depts.items[0]?.id ?? null, displayOrder: teams.items.length + 1, isActive: true }); setTeamEdit('new'); }}>
            ＋ チーム追加
          </Button>
        </div>
        {teams.loading ? <Spinner /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>表示順</th><th>チーム名</th><th>所属部署</th><th>状態</th><th></th></tr></thead>
              <tbody>
                {teams.items.map((t) => (
                  <tr key={t.id}>
                    <td className="tabular">{t.displayOrder}</td>
                    <td>{t.name}</td>
                    <td className="muted">{deptName(t.departmentId)}</td>
                    <td><span className={t.isActive ? `${styles.tag} ${styles['tag--on']}` : `${styles.tag} ${styles['tag--off']}`}>{t.isActive ? '有効' : '無効'}</span></td>
                    <td><div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => { setTeamDraft({ name: t.name, departmentId: t.departmentId, displayOrder: t.displayOrder, isActive: t.isActive }); setTeamEdit(t); }}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => removeTeam(t)}>削除</Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 部署モーダル */}
      <Modal
        open={deptEdit !== null}
        title={deptEdit === 'new' ? '部署を追加' : '部署を編集'}
        onClose={() => setDeptEdit(null)}
        footer={<>
          <Button variant="subtle" onClick={() => setDeptEdit(null)}>キャンセル</Button>
          <Button variant="primary" block onClick={saveDept} disabled={!deptDraft.name}>保存</Button>
        </>}
      >
        <Field label="部署名"><Input value={deptDraft.name} onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })} /></Field>
        <Field label="表示順"><Input type="number" value={deptDraft.displayOrder} onChange={(e) => setDeptDraft({ ...deptDraft, displayOrder: Number(e.target.value) })} /></Field>
        <div className="row row-3"><Toggle checked={deptDraft.isActive} onChange={(v) => setDeptDraft({ ...deptDraft, isActive: v })} /><span className="muted">有効にする</span></div>
      </Modal>

      {/* チームモーダル */}
      <Modal
        open={teamEdit !== null}
        title={teamEdit === 'new' ? 'チームを追加' : 'チームを編集'}
        onClose={() => setTeamEdit(null)}
        footer={<>
          <Button variant="subtle" onClick={() => setTeamEdit(null)}>キャンセル</Button>
          <Button variant="primary" block onClick={saveTeam} disabled={!teamDraft.name}>保存</Button>
        </>}
      >
        <Field label="チーム名"><Input value={teamDraft.name} onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })} /></Field>
        <Field label="所属部署">
          <Select value={teamDraft.departmentId ?? ''} onChange={(e) => setTeamDraft({ ...teamDraft, departmentId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">未所属</option>
            {depts.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="表示順"><Input type="number" value={teamDraft.displayOrder} onChange={(e) => setTeamDraft({ ...teamDraft, displayOrder: Number(e.target.value) })} /></Field>
        <div className="row row-3"><Toggle checked={teamDraft.isActive} onChange={(v) => setTeamDraft({ ...teamDraft, isActive: v })} /><span className="muted">有効にする</span></div>
      </Modal>
    </div>
  );
}

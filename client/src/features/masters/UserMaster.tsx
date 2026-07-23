import { useCallback, useMemo, useState } from 'react';
import { ROLE_LABELS, type Department, type Role, type Team, type User } from '@saiji/shared';
import { departmentApi, rosterApi, teamApi, userApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Field, Input, Modal, Select, Spinner, useToast } from '@/components/ui';
import { useList } from './useList';
import styles from './Masters.module.css';

interface Draft {
  employeeId: string;
  email: string;
  kintoneUser: string;
  name: string;
  displayName: string;
  password: string;
  role: Role;
  departmentId: number | null;
  teamId: number | null;
  managerId: number | null;
  title: string;
  status: 'active' | 'inactive';
  displayOrder: number;
}

const emptyDraft = (order: number): Draft => ({
  employeeId: '',
  email: '',
  kintoneUser: '',
  name: '',
  displayName: '',
  password: '',
  role: 'sales',
  departmentId: null,
  teamId: null,
  managerId: null,
  title: '',
  status: 'active',
  displayOrder: order,
});

export function UserMaster() {
  const toast = useToast();
  const users = useList<User>(useCallback(() => userApi.list(), []));
  const depts = useList<Department>(useCallback(() => departmentApi.list(), []));
  const teams = useList<Team>(useCallback(() => teamApi.list(), []));

  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(0));
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const managers = useMemo(
    () => users.items.filter((u) => u.role === 'manager' || u.role === 'admin'),
    [users.items],
  );
  const teamsForDept = useMemo(
    () => teams.items.filter((t) => draft.departmentId == null || t.departmentId === draft.departmentId),
    [teams.items, draft.departmentId],
  );

  const openNew = () => {
    setDraft(emptyDraft(users.items.length + 1));
    setEditing('new');
  };
  const openEdit = (u: User) => {
    setDraft({
      employeeId: u.employeeId,
      email: u.email ?? '',
      kintoneUser: u.kintoneUser ?? '',
      name: u.name,
      displayName: u.displayName,
      password: '',
      role: u.role,
      departmentId: u.departmentId,
      teamId: u.teamId,
      managerId: u.managerId,
      title: u.title ?? '',
      status: u.status,
      displayOrder: u.displayOrder,
    });
    setEditing(u);
  };

  const save = async () => {
    setSaving(true);
    try {
      const base = {
        email: draft.email || null,
        kintoneUser: draft.kintoneUser || null,
        name: draft.name,
        displayName: draft.displayName,
        role: draft.role,
        departmentId: draft.departmentId,
        teamId: draft.teamId,
        managerId: draft.managerId,
        title: draft.title || null,
        status: draft.status,
        displayOrder: draft.displayOrder,
      };
      if (editing === 'new') {
        await userApi.create({ ...base, employeeId: draft.employeeId, password: draft.password });
      } else if (editing) {
        const payload: Record<string, unknown> = { ...base };
        if (draft.password) payload.password = draft.password; // 空欄なら変更しない
        await userApi.update(editing.id, payload);
      }
      toast.success('保存しました');
      setEditing(null);
      await users.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: User) => {
    if (!window.confirm(`「${u.name}」を削除しますか？`)) return;
    try {
      await userApi.remove(u.id);
      toast.success('削除しました');
      await users.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const syncRoster = async () => {
    if (!window.confirm('Googleシートの名簿から同期します。\n催事メンバー等を取り込み、退職者・名簿外は無効化されます。よろしいですか？')) return;
    setSyncing(true);
    try {
      const r = await rosterApi.sync();
      toast.success(`名簿同期: 新規${r.created} / 更新${r.updated} / 無効化${r.deactivated}`);
      await users.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const createDisabled =
    saving ||
    !draft.name ||
    !draft.displayName ||
    (editing === 'new' && (!draft.employeeId || draft.password.length < 4));

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.toolbar}>
        <div className={styles.sectionTitle}>営業担当マスタ</div>
        <div className="row row-2">
          <Button variant="ghost" onClick={syncRoster} disabled={syncing}>
            {syncing ? '同期中…' : '⟳ Googleシートから同期'}
          </Button>
          <Button variant="primary" onClick={openNew}>＋ ユーザー追加</Button>
        </div>
      </div>

      {users.loading ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>順</th><th>社員ID</th><th>メール</th><th>表示名</th><th>部署</th><th>チーム</th>
                <th>役職</th><th>権限</th><th>責任者</th><th>状態</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.items.map((u) => (
                <tr key={u.id}>
                  <td className="tabular">{u.displayOrder}</td>
                  <td><code>{u.employeeId}</code></td>
                  <td className="muted">{u.email ?? '—'}</td>
                  <td>{u.displayName}</td>
                  <td>{u.departmentName ?? '—'}</td>
                  <td className="muted">{u.teamName ?? '—'}</td>
                  <td className="muted">{u.title ?? '—'}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td className="muted">{u.managerName ?? '—'}</td>
                  <td>
                    <span className={u.status === 'active' ? `${styles.tag} ${styles['tag--on']}` : `${styles.tag} ${styles['tag--off']}`}>
                      {u.status === 'active' ? '在籍' : '退職'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => remove(u)}>削除</Button>
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
        title={typeof editing === 'object' && editing ? `ユーザーを編集: ${editing.name}` : 'ユーザーを追加'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>キャンセル</Button>
            <Button variant="primary" block onClick={save} disabled={createDisabled}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Field label="社員ID">
            <Input value={draft.employeeId} onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })} disabled={editing !== 'new'} placeholder="例: sales6" />
          </Field>
          <Field label={editing === 'new' ? 'パスワード（緊急用）' : 'パスワード (変更時のみ)'}>
            <Input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder={editing === 'new' ? '4文字以上' : '空欄で変更なし'} />
          </Field>
          <Field label="メール (Googleログイン用)">
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="例: taro@gmail.com" />
          </Field>
          <Field label="キントーンユーザー (日報用)">
            <Input value={draft.kintoneUser} onChange={(e) => setDraft({ ...draft, kintoneUser: e.target.value })} placeholder="キントーンのログイン名" />
            <span className="field__label" style={{ fontWeight: 400, opacity: 0.7, marginTop: 4 }}>
              名簿シートの「キントーンユーザー名」列から同期で自動設定されます（同期時に上書き）。
            </span>
          </Field>
          <Field label="氏名">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例: 営業 太郎" />
          </Field>
          <Field label="表示名">
            <Input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="例: 太郎" />
          </Field>
          <Field label="部署">
            <Select value={draft.departmentId ?? ''} onChange={(e) => setDraft({ ...draft, departmentId: e.target.value ? Number(e.target.value) : null, teamId: null })}>
              <option value="">未所属</option>
              {depts.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="チーム">
            <Select value={draft.teamId ?? ''} onChange={(e) => setDraft({ ...draft, teamId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">未所属</option>
              {teamsForDept.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="役職">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="例: リーダー" />
          </Field>
          <Field label="権限">
            <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
              <option value="sales">営業担当</option>
              <option value="leader">リーダー</option>
              <option value="manager">責任者</option>
              <option value="admin">管理者</option>
            </Select>
          </Field>
          <Field label="責任者">
            <Select value={draft.managerId ?? ''} onChange={(e) => setDraft({ ...draft, managerId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">未設定</option>
              {managers.filter((m) => editing === 'new' || editing === null || m.id !== editing.id).map((m) => (
                <option key={m.id} value={m.id}>{m.name}（{m.departmentName ?? '—'}）</option>
              ))}
            </Select>
          </Field>
          <Field label="在籍状態">
            <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })}>
              <option value="active">在籍</option>
              <option value="inactive">退職</option>
            </Select>
          </Field>
          <Field label="表示順">
            <Input type="number" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

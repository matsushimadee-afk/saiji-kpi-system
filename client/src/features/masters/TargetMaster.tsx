import { useCallback, useMemo, useState } from 'react';
import type { Department, Kpi, PeriodType, Target, TargetScope, Team, User, Venue } from '@saiji/shared';
import { departmentApi, kpiApi, targetApi, teamApi, userApi, venueApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Field, Input, Modal, Select, Spinner, Tabs, useToast } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { useList } from './useList';
import styles from './Masters.module.css';

const SCOPE_LABELS: Record<TargetScope, string> = {
  overall: '全体',
  department: '部署',
  team: 'チーム',
  user: '営業担当',
  venue: '会場',
};

interface Draft {
  periodType: PeriodType;
  scope: TargetScope;
  scopeId: number | null;
  kpiId: number | null;
  targetValue: number;
}

export function TargetMaster() {
  const toast = useToast();
  const targets = useList<Target>(useCallback(() => targetApi.list(), []));
  const kpis = useList<Kpi>(useCallback(() => kpiApi.list(true), []));
  const depts = useList<Department>(useCallback(() => departmentApi.list(), []));
  const teams = useList<Team>(useCallback(() => teamApi.list(), []));
  const venues = useList<Venue>(useCallback(() => venueApi.list(false), []));
  const users = useList<User>(useCallback(() => userApi.list(), []));

  const [period, setPeriod] = useState<PeriodType>('daily');
  const [editing, setEditing] = useState<Target | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({ periodType: 'daily', scope: 'overall', scopeId: null, kpiId: null, targetValue: 0 });
  const [saving, setSaving] = useState(false);

  const kpiName = (id: number) => kpis.items.find((k) => k.id === id)?.name ?? `#${id}`;

  const scopeOptions = useCallback(
    (scope: TargetScope): { id: number; label: string }[] => {
      switch (scope) {
        case 'department': return depts.items.map((d) => ({ id: d.id, label: d.name }));
        case 'team': return teams.items.map((t) => ({ id: t.id, label: t.name }));
        case 'venue': return venues.items.map((v) => ({ id: v.id, label: v.name }));
        case 'user': return users.items.map((u) => ({ id: u.id, label: `${u.name}` }));
        default: return [];
      }
    },
    [depts.items, teams.items, venues.items, users.items],
  );

  const targetLabel = (t: Target): string => {
    if (t.scope === 'overall') return '全体';
    const opt = scopeOptions(t.scope).find((o) => o.id === t.scopeId);
    return opt?.label ?? '—';
  };

  const filtered = useMemo(() => targets.items.filter((t) => t.periodType === period), [targets.items, period]);

  const openNew = () => {
    setDraft({ periodType: period, scope: 'overall', scopeId: null, kpiId: kpis.items[0]?.id ?? null, targetValue: 0 });
    setEditing('new');
  };
  const openEdit = (t: Target) => {
    setDraft({ periodType: t.periodType, scope: t.scope, scopeId: t.scopeId, kpiId: t.kpiId, targetValue: t.targetValue });
    setEditing(t);
  };

  const changeScope = (scope: TargetScope) => {
    const opts = scopeOptions(scope);
    setDraft((d) => ({ ...d, scope, scopeId: scope === 'overall' ? null : opts[0]?.id ?? null }));
  };

  const save = async () => {
    if (draft.kpiId == null) return;
    setSaving(true);
    try {
      await targetApi.upsert({
        periodType: draft.periodType,
        scope: draft.scope,
        scopeId: draft.scope === 'overall' ? null : draft.scopeId,
        kpiId: draft.kpiId,
        targetValue: draft.targetValue,
      });
      toast.success('保存しました');
      setEditing(null);
      await targets.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Target) => {
    if (!window.confirm('この目標を削除しますか？')) return;
    try {
      await targetApi.remove(t.id);
      await targets.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const loading = targets.loading || kpis.loading;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.toolbar}>
        <div className={styles.sectionTitle}>目標マスタ</div>
        <div className="row row-3">
          <Tabs
            items={[{ value: 'daily', label: '日次目標' }, { value: 'monthly', label: '月次目標' }]}
            value={period}
            onChange={(v) => setPeriod(v as PeriodType)}
          />
          <Button variant="primary" onClick={openNew}>＋ 目標追加</Button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>スコープ</th><th>対象</th><th>KPI</th><th>目標値</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{SCOPE_LABELS[t.scope]}</td>
                  <td>{targetLabel(t)}</td>
                  <td>{kpiName(t.kpiId)}</td>
                  <td className="tabular">{formatNumber(t.targetValue)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>編集</Button>
                      <Button size="sm" variant="subtle" onClick={() => remove(t)}>削除</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="muted center" style={{ padding: 'var(--space-6)' }}>目標が未設定です</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? '目標を追加' : '目標を編集'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>キャンセル</Button>
            <Button variant="primary" block onClick={save} disabled={saving || draft.kpiId == null}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Field label="期間">
            <Select value={draft.periodType} onChange={(e) => setDraft({ ...draft, periodType: e.target.value as PeriodType })}>
              <option value="daily">日次</option>
              <option value="monthly">月次</option>
            </Select>
          </Field>
          <Field label="KPI">
            <Select value={draft.kpiId ?? ''} onChange={(e) => setDraft({ ...draft, kpiId: e.target.value ? Number(e.target.value) : null })}>
              {kpis.items.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </Select>
          </Field>
          <Field label="スコープ">
            <Select value={draft.scope} onChange={(e) => changeScope(e.target.value as TargetScope)}>
              {(Object.keys(SCOPE_LABELS) as TargetScope[]).map((s) => (
                <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="対象">
            <Select
              value={draft.scopeId ?? ''}
              disabled={draft.scope === 'overall'}
              onChange={(e) => setDraft({ ...draft, scopeId: e.target.value ? Number(e.target.value) : null })}
            >
              {draft.scope === 'overall'
                ? <option value="">全体</option>
                : scopeOptions(draft.scope).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="目標値">
            <Input type="number" min={0} value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: Number(e.target.value) })} className="full" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { entriesApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Card, Field, Input, Modal, useToast } from '@/components/ui';
import { todayStr } from '@/lib/format';
import styles from './Masters.module.css';

const CONFIRM_WORD = 'リセット';

/** 'beforeToday' = 本日より前だけ削除 / 'all' = 全期間削除 */
type Mode = 'beforeToday' | 'all';

const MODE_INFO: Record<Mode, { title: string; warn: string }> = {
  beforeToday: {
    title: '昨日までのデータを削除',
    warn: '本日より前の入力をすべて削除します。本日の入力は残ります。',
  },
  all: {
    title: '全期間のデータを削除',
    warn: '本日の入力も含めて、すべての入力を削除します。',
  },
};

export function DataManagement() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setMode(null);
    setConfirmText('');
  };

  const doReset = async () => {
    if (!mode) return;
    setBusy(true);
    try {
      const r = await entriesApi.reset(mode === 'beforeToday' ? todayStr() : undefined);
      toast.success(`入力データ ${r.deleted.toLocaleString('ja-JP')} 件を削除しました`);
      close();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className={styles.sectionTitle}>データ管理</div>

      <Card title="カウントのリセット">
        <div className="stack" style={{ gap: 'var(--space-4)' }}>
          <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
            入力データ（KPIのカウント）を削除します。テストデータの整理や、本運用の開始時に使います。
          </p>

          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: '0.85rem',
              fontWeight: 600,
              lineHeight: 1.7,
            }}
          >
            ⚠️ 削除したデータは元に戻せません。<br />
            ※ KPI・転換率・会場・担当者・目標などの<strong>マスタ設定は消えません</strong>。
          </div>

          <div className="row row-3 wrap">
            <Button variant="ghost" onClick={() => setMode('beforeToday')}>
              🗓 昨日までを削除（本日分は残す）
            </Button>
            <Button variant="danger" onClick={() => setMode('all')}>
              全期間を削除
            </Button>
          </div>
          <p className="faint" style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.7 }}>
            すでに稼働を始めた後にテストデータを消したいときは、
            <b>「昨日までを削除」</b>を使うと本日の入力を守れます。
          </p>
        </div>
      </Card>

      <Modal
        open={mode !== null}
        title={mode ? MODE_INFO[mode].title : ''}
        onClose={close}
        footer={
          <>
            <Button variant="subtle" onClick={close}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              block
              onClick={doReset}
              disabled={busy || confirmText.trim() !== CONFIRM_WORD}
            >
              {busy ? '削除中…' : '削除を実行'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {mode && MODE_INFO[mode].warn}
          <br />
          <span className="muted">この操作は取り消せません。</span>
        </p>
        <Field label={`確認のため「${CONFIRM_WORD}」と入力してください`}>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
          />
        </Field>
      </Modal>
    </div>
  );
}

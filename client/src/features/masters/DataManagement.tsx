import { useState } from 'react';
import { entriesApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/client';
import { Button, Card, Field, Input, Modal, useToast } from '@/components/ui';
import styles from './Masters.module.css';

const CONFIRM_WORD = 'リセット';

export function DataManagement() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirmText('');
  };

  const doReset = async () => {
    setBusy(true);
    try {
      const r = await entriesApi.reset();
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
            これまでの<strong>入力データ（全KPIのカウント）をすべて削除</strong>します。
            本運用を始める前に、テスト入力を消してゼロから始めたいときに使います。
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
            ※ KPI・転換率・会場・担当者・目標などの<strong>マスタ設定は消えません</strong>（入力カウントだけを削除します）。
          </div>
          <div>
            <Button variant="danger" onClick={() => setOpen(true)}>
              全カウントをリセット
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={open}
        title="全カウントをリセット"
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
              {busy ? '削除中…' : 'リセットを実行'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          本当にすべての入力データを削除しますか？<br />
          <span className="muted">この操作は取り消せません。</span>
        </p>
        <Field label={`確認のため「${CONFIRM_WORD}」と入力してください`}>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoFocus
          />
        </Field>
      </Modal>
    </div>
  );
}

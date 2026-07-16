import { useMemo, useState } from 'react';
import type { Venue } from '@saiji/shared';
import { Input, Modal } from '@/components/ui';
import { cx } from '@/lib/cx';
import { matches, normalizeText } from '@/lib/search';
import styles from './VenuePicker.module.css';

const RECENT_KEY = 'kpi_recent_venues';
const RECENT_MAX = 5;

function getRecent(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

function pushRecent(id: number): void {
  const next = [id, ...getRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

interface Props {
  venues: Venue[];
  value: number | null;
  onChange: (id: number | null) => void;
}

/**
 * 会場ピッカー。会場数が多くても探せるよう、入力で候補を絞り込める。
 * よく使う会場は「最近使った会場」として上に出る。
 */
export function VenuePicker({ venues, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = venues.find((v) => v.id === value) ?? null;

  // 検索結果（名前・エリアのどちらでもヒット）
  const filtered = useMemo(() => venues.filter((v) => matches(q, v.name, v.area)), [venues, q]);

  // 検索していないときは「最近使った会場」を上に
  const recent = useMemo(() => {
    if (normalizeText(q)) return [];
    const ids = getRecent();
    return ids.map((id) => venues.find((v) => v.id === id)).filter((v): v is Venue => Boolean(v));
  }, [venues, q, open]);

  const rest = useMemo(
    () => (recent.length ? filtered.filter((v) => !recent.some((r) => r.id === v.id)) : filtered),
    [filtered, recent],
  );

  const close = () => {
    setOpen(false);
    setQ('');
  };

  const select = (id: number | null) => {
    if (id != null) pushRecent(id);
    onChange(id);
    close();
  };

  const renderItem = (v: Venue) => (
    <button
      key={v.id}
      type="button"
      className={cx(styles.item, v.id === value && styles.itemSelected)}
      onClick={() => select(v.id)}
    >
      <div className={styles.itemMain}>
        <div className={styles.itemName}>{v.name}</div>
        {v.area && <div className={styles.itemArea}>{v.area}</div>}
      </div>
      {v.id === value && <span className={styles.check}>✓</span>}
    </button>
  );

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <span>📍</span>
        <span className={cx(styles.triggerName, !selected && styles.placeholder)}>
          {selected ? selected.name : '会場を選ぶ'}
        </span>
        <span className={styles.caret}>▼</span>
      </button>

      <Modal open={open} title="会場を選ぶ" onClose={close}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="会場名・エリアで絞り込む"
          inputMode="search"
        />

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            「{q}」に一致する会場がありません
            <br />
            <span className={styles.count}>別の言葉で試してください</span>
          </div>
        ) : (
          <>
            {recent.length > 0 && (
              <>
                <div className={styles.sectionLabel}>最近使った会場</div>
                <div className={styles.list}>{recent.map(renderItem)}</div>
                {rest.length > 0 && <div className={styles.sectionLabel}>すべての会場</div>}
              </>
            )}
            {rest.length > 0 && (
              <div className={styles.list}>
                {rest.map(renderItem)}
                {value != null && !normalizeText(q) && (
                  <button type="button" className={styles.item} onClick={() => select(null)}>
                    <div className={styles.itemMain}>
                      <div className={styles.itemName} style={{ color: 'var(--text-muted)' }}>
                        未選択にする
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}
            <div className={styles.count}>{filtered.length}件の会場</div>
          </>
        )}
      </Modal>
    </>
  );
}

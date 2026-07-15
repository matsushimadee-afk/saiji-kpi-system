import { useCallback, useEffect, useRef, useState } from 'react';
import { useKpiUpdates } from '@/realtime/useKpiUpdates';

/**
 * 集計データをリアルタイム購読するフック。
 * - KPI 更新イベントを受けたら 400ms デバウンスで再取得
 * - 30 秒ごとのポーリングを保険として併用
 */
export function useLiveStats<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<number>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(fetcher, deps);

  useEffect(() => {
    setLoading(true);
    void reload().then(setData).finally(() => setLoading(false));
  }, [reload]);

  useKpiUpdates(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      void reload().then(setData);
    }, 400);
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      void reload().then(setData);
    }, 30000);
    return () => window.clearInterval(id);
  }, [reload]);

  return { data, loading };
}

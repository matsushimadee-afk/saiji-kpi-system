import { useCallback, useEffect, useState } from 'react';

/**
 * マスタ一覧の取得と再読込を扱う小さなフック。
 * fetcher は useCallback で安定させて渡すこと。
 */
export function useList<T>(fetcher: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetcher());
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, reload };
}

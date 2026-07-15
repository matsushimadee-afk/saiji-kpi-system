import { useCallback, useEffect, useState } from 'react';
import type { KpiSummaryItem, MySummaryResponse, RateResult } from '@saiji/shared';
import { entriesApi } from '@/api/endpoints';

/** KPI件数から転換率を再計算（タップ時の即時反映用） */
function recomputeRates(items: KpiSummaryItem[], rates: RateResult[]): RateResult[] {
  const countByKpi = new Map(items.map((i) => [i.kpiId, i.count]));
  return rates.map((r) => {
    const num = countByKpi.get(r.numeratorKpiId) ?? 0;
    const den = countByKpi.get(r.denominatorKpiId) ?? 0;
    return { ...r, numeratorCount: num, denominatorCount: den, rate: den > 0 ? Math.round((num / den) * 1000) / 10 : 0 };
  });
}

/**
 * 営業担当の当日サマリを管理するフック。
 * 入力は「押した瞬間に +1」を実現するため楽観的更新し、失敗時はサーバー値へ戻す。
 */
export function useMySummary(venueId: number | null) {
  const [data, setData] = useState<MySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const d = await entriesApi.mySummary();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** KPI を +1 (楽観的更新) */
  const increment = useCallback(
    async (kpiId: number) => {
      setData((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((it) =>
          it.kpiId === kpiId
            ? {
                ...it,
                count: it.count + 1,
                achievementRate: it.target > 0 ? Math.round(((it.count + 1) / it.target) * 1000) / 10 : 0,
              }
            : it,
        );
        return { ...prev, canUndo: true, items, rates: recomputeRates(items, prev.rates) };
      });
      try {
        await entriesApi.create({ kpiId, venueId });
      } catch (err) {
        await reload(); // サーバー値へ戻す
        throw err;
      }
    },
    [venueId, reload],
  );

  /** 直前の入力を取り消す */
  const undo = useCallback(async () => {
    await entriesApi.undo();
    await reload();
  }, [reload]);

  return { data, loading, increment, undo, reload };
}

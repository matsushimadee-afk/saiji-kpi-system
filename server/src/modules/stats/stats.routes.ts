import { Router } from 'express';
import { DASHBOARD_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { currentMonth, isValidDate, isValidMonth, monthRange, todayDate } from '../../utils/datetime.js';
import * as stats from './stats.service.js';

export const statsRouter = Router();
statsRouter.use(authenticate);

// デイリーダッシュボード (リーダー・責任者・管理者)
statsRouter.get(
  '/daily',
  authorize(...DASHBOARD_ROLES),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const date = typeof req.query.date === 'string' && isValidDate(req.query.date) ? req.query.date : todayDate();
    res.json(await stats.getDailyStats(me, date));
  }),
);

// 当月ダッシュボード (リーダー・責任者・管理者)
statsRouter.get(
  '/monthly',
  authorize(...DASHBOARD_ROLES),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const month = typeof req.query.month === 'string' && isValidMonth(req.query.month) ? req.query.month : currentMonth();
    res.json(await stats.getMonthlyStats(me, month));
  }),
);

/** 期間パラメータ (from/to) を解決。既定は当月。 */
function resolveRange(req: { query: Record<string, unknown> }): { from: string; to: string } {
  const { start, endExclusive } = monthRange(currentMonth());
  // endExclusive は翌月1日なので、既定の to は本日
  const from = typeof req.query.from === 'string' && isValidDate(req.query.from) ? req.query.from : start;
  const to = typeof req.query.to === 'string' && isValidDate(req.query.to) ? req.query.to : todayDate();
  void endExclusive;
  return { from, to };
}

// 分析（時系列トレンド）: 全ロール。営業担当は自分のみに制限される。
statsRouter.get(
  '/trend',
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const { from, to } = resolveRange(req);
    const scope = (req.query.scope as string) === 'all' ? 'all' : (req.query.scope as string) === 'user' ? 'user' : 'self';
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    res.json(await stats.getTrend(me, { scope, userId, from, to }));
  }),
);

// CSV 出力 (リーダー・責任者・管理者)
statsRouter.get(
  '/export.csv',
  authorize(...DASHBOARD_ROLES),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const { from, to } = resolveRange(req);
    const csv = await stats.buildCsv(me, from, to);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kpi_${from}_${to}.csv"`);
    res.send(csv);
  }),
);

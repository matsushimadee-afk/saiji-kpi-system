import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { orgRouter } from './modules/org/org.routes.js';
import { kpisRouter } from './modules/kpis/kpis.routes.js';
import { venuesRouter } from './modules/venues/venues.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { targetsRouter } from './modules/targets/targets.routes.js';
import { entriesRouter } from './modules/entries/entries.routes.js';
import { statsRouter } from './modules/stats/stats.routes.js';
import { rosterRouter } from './modules/roster/roster.routes.js';
import { ratesRouter } from './modules/rates/rates.routes.js';

/** すべての API ルートを /api 配下に集約する */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/org', orgRouter); // 部署・チーム
apiRouter.use('/kpis', kpisRouter);
apiRouter.use('/rates', ratesRouter); // 転換率マスタ
apiRouter.use('/venues', venuesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/targets', targetsRouter);
apiRouter.use('/entries', entriesRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/roster', rosterRouter); // 名簿(Googleシート)同期

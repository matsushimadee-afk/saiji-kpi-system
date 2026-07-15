import { NextFunction, Request, Response } from 'express';

/** async ハンドラの例外を Express のエラーミドルウェアへ確実に流す */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

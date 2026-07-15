import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  /** 余白付きの本文ラッパを付けない場合は false */
  padded?: boolean;
}

export function Card({ title, action, padded = true, className, children, ...rest }: CardProps) {
  return (
    <div className={cx('card', className)} {...rest}>
      {(title || action) && (
        <div className="card__header">
          <div className="card__title">{title}</div>
          {action}
        </div>
      )}
      {padded ? <div className="card__body">{children}</div> : children}
    </div>
  );
}

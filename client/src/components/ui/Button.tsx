import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'default' | 'primary' | 'ghost' | 'danger' | 'subtle';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  block?: boolean;
  icon?: boolean;
}

export function Button({ variant = 'default', size = 'md', block, icon, className, ...rest }: Props) {
  return (
    <button
      className={cx(
        'btn',
        variant !== 'default' && `btn--${variant}`,
        size === 'sm' && 'btn--sm',
        block && 'btn--block',
        icon && 'btn--icon',
        className,
      )}
      {...rest}
    />
  );
}

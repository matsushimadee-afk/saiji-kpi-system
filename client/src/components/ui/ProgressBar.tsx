import { clampPercent, rateColor } from '@/lib/format';

interface Props {
  /** 達成率 (%) */
  rate: number;
  /** 明示的に色を指定する場合 (未指定なら達成率に応じた色) */
  color?: string;
  height?: number;
}

export function ProgressBar({ rate, color, height = 8 }: Props) {
  return (
    <div className="progress" style={{ height }}>
      <div
        className="progress__bar"
        style={{ width: `${clampPercent(rate)}%`, background: color ?? rateColor(rate) }}
      />
    </div>
  );
}

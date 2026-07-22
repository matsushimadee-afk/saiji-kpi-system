interface Point {
  label: string; // 例: 07/16
  value: number;
}

interface Props {
  points: Point[];
  color?: string;
  height?: number;
}

/**
 * 依存ライブラリなしの折れ線グラフ（SVG）。
 * 点数が多いときは横スクロールで全期間を追える。
 */
export function LineChart({ points, color = 'var(--brand)', height = 200 }: Props) {
  if (points.length === 0) {
    return <div className="empty">データがありません</div>;
  }

  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const stepX = 54;
  const innerW = Math.max(280, (points.length - 1) * stepX + 10);
  const width = padL + innerW + padR;
  const innerH = height - padT - padB;

  const max = Math.max(1, ...points.map((p) => p.value));
  // 目盛りをキリの良い値に
  const niceMax = niceCeil(max);

  const x = (i: number) => padL + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v: number) => padT + innerH - (v / niceMax) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  // x ラベルは詰まらないよう間引く
  const labelEvery = Math.ceil(points.length / Math.max(1, Math.floor(innerW / 60)));
  const gridVals = [0, niceMax / 2, niceMax];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} role="img" style={{ display: 'block' }}>
        {/* グリッド + y ラベル */}
        {gridVals.map((gv) => (
          <g key={gv}>
            <line x1={padL} x2={width - padR} y1={y(gv)} y2={y(gv)} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 6} y={y(gv) + 3} textAnchor="end" fontSize="10" fill="var(--text-faint)">
              {formatShort(gv)}
            </text>
          </g>
        ))}

        {/* エリア + 線 */}
        <path d={areaPath} fill={color} opacity="0.12" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* 点 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 3} fill={color}>
              <title>{`${p.label}: ${p.value.toLocaleString('ja-JP')}`}</title>
            </circle>
            {(i % labelEvery === 0 || i === points.length - 1) && (
              <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function niceCeil(n: number): number {
  if (n <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / mag) * mag;
}

function formatShort(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n));
}

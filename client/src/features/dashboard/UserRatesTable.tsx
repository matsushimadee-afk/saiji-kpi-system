import type { RankingRow } from '@saiji/shared';
import { Card, EmptyState } from '@/components/ui';
import { formatNumber } from '@/lib/format';

interface Props {
  rows: RankingRow[];
  title?: string;
}

/**
 * 個人（担当者）ごとの転換率を一覧表示する。
 * 責任者・リーダーが各メンバーの数値を比較できるようにするための表。
 * ※ 転換率は「目標に対する達成率」ではないため、良し悪しの色付けはしない
 *   （何%が良いかは商材・会場で変わるため、比較は横並びの数値で行う）。
 */
export function UserRatesTable({ rows, title = '個人別 数値（転換率）' }: Props) {
  if (rows.length === 0) {
    return (
      <Card title={title}>
        <EmptyState message="データがありません" />
      </Card>
    );
  }

  const rateCols = rows[0].rates;

  return (
    <Card title={title} padded={false}>
      <div className="table-wrap" style={{ border: 'none' }}>
        <table className="table">
          <thead>
            <tr>
              <th>営業担当</th>
              {rateCols.map((r) => (
                <th key={r.id}>{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ fontWeight: 700 }}>{row.label}</td>
                {row.rates.map((rt) => (
                  <td key={rt.id} className="tabular">
                    {rt.denominatorCount > 0 ? (
                      <>
                        <span style={{ fontWeight: 800 }}>{rt.rate}%</span>
                        <span className="faint" style={{ fontSize: '0.7rem', marginLeft: 5 }}>
                          {formatNumber(rt.numeratorCount)}/{formatNumber(rt.denominatorCount)}
                        </span>
                      </>
                    ) : (
                      <span className="faint">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

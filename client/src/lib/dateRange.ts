/** YYYY-MM から その月の初日・末日 (YYYY-MM-DD) を返す */
export function monthStartEnd(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate(); // m は1-12、日0で前月末日=当月末日
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}

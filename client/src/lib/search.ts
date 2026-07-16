/** 全角/半角・大文字小文字・空白の違いを吸収して比較できる形にする */
export function normalizeText(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/**
 * 検索語が対象フィールドのいずれかに含まれるか。
 * 空の検索語はすべて一致とみなす。
 */
export function matches(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return fields.some((f) => Boolean(f) && normalizeText(f as string).includes(q));
}

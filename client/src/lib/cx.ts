/** クラス名を条件付きで結合する小さなヘルパ */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

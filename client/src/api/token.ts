/** 認証トークンの永続化 (localStorage)。API クライアントと認証ストアが共有する。 */
const TOKEN_KEY = 'kpi_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

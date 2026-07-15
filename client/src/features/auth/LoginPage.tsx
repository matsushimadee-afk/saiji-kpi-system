import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import type { AuthConfig } from '@saiji/shared';
import { useAuthStore } from '@/store/authStore';
import { defaultRouteForRole } from '@/components/auth/RoleGate';
import { refreshSocketAuth } from '@/realtime/socket';
import { authApi } from '@/api/endpoints';
import { getErrorMessage as errMsg } from '@/api/client';
import { Button, Field, Input, Spinner } from '@/components/ui';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, status, login, loginWithGoogle } = useAuthStore();
  const navigate = useNavigate();

  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState('');
  const [showBreakGlass, setShowBreakGlass] = useState(false);

  // 緊急用ログイン
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authApi
      .config()
      .then(setConfig)
      .catch(() => setConfig({ googleEnabled: false, googleClientId: '' }));
  }, []);

  if (status === 'authenticated' && user) {
    return <Navigate to={defaultRouteForRole(user.role)} replace />;
  }

  const goHome = () => {
    refreshSocketAuth();
    const role = useAuthStore.getState().user!.role;
    navigate(defaultRouteForRole(role), { replace: true });
  };

  const onGoogle = async (credential?: string) => {
    if (!credential) return;
    setError('');
    try {
      await loginWithGoogle(credential);
      goHome();
    } catch (err) {
      setError(errMsg(err, 'Googleログインに失敗しました'));
    }
  };

  const onBreakGlass = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(employeeId.trim(), password);
      goHome();
    } catch (err) {
      setError(errMsg(err, 'ログインに失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  const breakGlassForm = (
    <form className="stack stack-4" onSubmit={onBreakGlass}>
      <Field label="社員ID">
        <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="例: admin" autoComplete="username" />
      </Field>
      <Field label="パスワード">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="パスワード" autoComplete="current-password" />
      </Field>
      <Button type="submit" variant="primary" block disabled={loading || !employeeId || !password}>
        {loading ? 'ログイン中…' : '管理者ログイン'}
      </Button>
    </form>
  );

  return (
    <div className={styles.wrap}>
      <div style={{ position: 'fixed', top: 12, right: 12 }}>
        <ThemeToggle />
      </div>
      <div className={styles.box}>
        <div className={styles.head}>
          <div className={styles.mark}>KPI</div>
          <h1 className={styles.title}>催事KPI管理</h1>
          <p className={styles.sub}>Googleアカウントでログイン</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {config === null ? (
          <Spinner label="読み込み中…" />
        ) : config.googleEnabled ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleOAuthProvider clientId={config.googleClientId}>
                <GoogleLogin
                  ux_mode="redirect"
                  login_uri={`${window.location.origin}/api/auth/google/callback`}
                  onSuccess={(cred) => onGoogle(cred.credential)}
                  onError={() => setError('Googleログインに失敗しました')}
                  locale="ja"
                  text="signin_with"
                  shape="pill"
                  width="300"
                />
              </GoogleOAuthProvider>
            </div>
            <div className={styles.demo}>
              名簿(Googleシート)に登録されたGmailのみログインできます。
              <br />
              対象外のアカウントは管理者へご連絡ください。
            </div>
            <button className={styles.linkBtn} onClick={() => setShowBreakGlass((v) => !v)} type="button">
              管理者ログイン（緊急用）
            </button>
            {showBreakGlass && breakGlassForm}
          </>
        ) : (
          <>
            <div className={styles.demo}>
              ⚠️ Googleログインは未設定です（<code>GOOGLE_CLIENT_ID</code>）。
              <br />
              設定までは下記の管理者ログインをご利用ください。手順は docs/GOOGLE_LOGIN_SETUP.md を参照。
            </div>
            {breakGlassForm}
          </>
        )}
      </div>
    </div>
  );
}

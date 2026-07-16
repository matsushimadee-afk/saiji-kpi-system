import { useCallback } from 'react';
import { DASHBOARD_ROLES, ROLE_LABELS, type Kpi } from '@saiji/shared';
import { kpiApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { Card, Spinner } from '@/components/ui';
import { useList } from '@/features/masters/useList';
import styles from './HelpPage.module.css';

/**
 * アプリ内の使い方ガイド。
 * KPIの項目名と「押すタイミング」はマスタから取得するため、
 * マスタを編集すればこのページも自動で最新になる。
 */
export function HelpPage() {
  const user = useAuthStore((s) => s.user)!;
  const { items: kpis, loading } = useList<Kpi>(useCallback(() => kpiApi.list(false), []));
  const canSeeDashboard = DASHBOARD_ROLES.includes(user.role);

  return (
    <div className={styles.page + ' fade-in'}>
      <div>
        <div className={styles.title}>使い方</div>
        <div className={styles.lead}>
          {user.displayName} さん（{ROLE_LABELS[user.role]}）／ 現場でやることは「ボタンを押すだけ」です
        </div>
      </div>

      {/* 毎日の使い方 */}
      <Card title="毎日の使い方">
        <ol className={styles.steps}>
          <li>
            <div className={styles.stepTitle}>会場をえらぶ</div>
            <p className={styles.stepBody}>
              「入力」画面の上にある<b>会場</b>から、今日の会場を選びます。1日の最初に1回だけでOK（次回も覚えています）。
            </p>
          </li>
          <li>
            <div className={styles.stepTitle}>発生したらすぐボタンを押す</div>
            <p className={styles.stepBody}>
              大きなボタンを押すだけ。<b>押した瞬間に記録・保存</b>されます（確認画面は出ません）。数字がすぐ増えます。
            </p>
          </li>
          <li>
            <div className={styles.stepTitle}>間違えたら取り消す</div>
            <p className={styles.stepBody}>
              画面の下の <span className={styles.key}>↩ 直前の入力を取り消す</span> で、<b>最後に押した1件</b>を取り消せます。
              何件か間違えたら、その回数ぶん押してください。
            </p>
          </li>
          <li>
            <div className={styles.stepTitle}>自分の数値を確認する</div>
            <p className={styles.stepBody}>
              ボタンの下の「本日の転換率」が、押すたびに自動で計算されます。その場で自分の調子が分かります。
            </p>
          </li>
        </ol>
        <div className={styles.tip} style={{ marginTop: 'var(--space-4)' }}>
          押す順番は自由です。思い出した時にまとめて押しても大丈夫。<b>押し忘れないこと</b>が一番大事です。
        </div>
      </Card>

      {/* 入力する項目（マスタ連動） */}
      <Card title="入力する項目">
        {loading ? (
          <Spinner />
        ) : (
          <div className={styles.kpiList}>
            {kpis.map((k, i) => (
              <div className={styles.kpiRow} key={k.id}>
                <span className={styles.kpiIdx} style={{ background: k.color ?? 'var(--brand)' }}>
                  {i + 1}
                </span>
                <div>
                  <div className={styles.kpiName}>{k.name}</div>
                  {k.description && <div className={styles.kpiDesc}>{k.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* リーダー・責任者向け */}
      {canSeeDashboard && (
        <Card title="リーダー・責任者ができること">
          <ol className={styles.steps}>
            <li>
              <div className={styles.stepTitle}>📊 ダッシュボードで全体を見る</div>
              <p className={styles.stepBody}>
                <b>「デイリー」＝今日</b>／<b>「当月」＝今月</b>を切り替えられます。
              </p>
            </li>
            <li>
              <div className={styles.stepTitle}>個人ごとの数値を見る</div>
              <p className={styles.stepBody}>
                「個人別 数値（転換率）」の表で、メンバー一人ひとりの転換率を横並びで比較できます。
                数字の横の <b>(50/80)</b> は「80回のうち50回」の意味。<b>少ない回数での高%</b>は参考程度に見てください。
              </p>
            </li>
            <li>
              <div className={styles.stepTitle}>更新ボタンは不要</div>
              <p className={styles.stepBody}>
                「リアルタイム更新中」と出ている間は、<b>メンバーが押した瞬間に数字が変わります</b>。開いたままでOKです。
              </p>
            </li>
            <li>
              <div className={styles.stepTitle}>⚙️ マスタ管理で設定を変える</div>
              <p className={styles.stepBody}>
                項目・転換率・会場・目標などを変更できます。新メンバーが入ったら「営業担当」→
                <span className={styles.key}>⟳ Googleシートから同期</span> を押すだけで取り込めます。
                この「使い方」の項目説明も、KPIマスタの<b>説明（押すタイミング）</b>を直せば変わります。
              </p>
            </li>
          </ol>
        </Card>
      )}

      {/* 困ったとき */}
      <Card title="困ったときは">
        <details className={styles.qaItem}>
          <summary>開くのが遅い／なかなか表示されない</summary>
          <p>
            しばらく誰も使っていないと休止状態になり、<b>最初の1人だけ30〜60秒</b>かかります。
            一度開けばその後はサクサク動きます。
          </p>
        </details>
        <details className={styles.qaItem}>
          <summary>「アクセスをブロック」でログインできない</summary>
          <p>
            <b>LINEなどのアプリ内ブラウザ</b>から開くと必ず失敗します。Safari／Chromeで開き直してください。
            それでもダメなら、あなたのGmailが未登録の可能性があるので管理者にご連絡ください。
          </p>
        </details>
        <details className={styles.qaItem}>
          <summary>ホーム画面に追加したい</summary>
          <p>
            ブラウザの共有ボタン →「ホーム画面に追加」。アプリのように1タップで開けるようになります（おすすめ）。
          </p>
        </details>
        <details className={styles.qaItem}>
          <summary>スマホを変えた／別の端末で使いたい</summary>
          <p>
            同じURLを開いて、同じGmailでGoogleログインすればすぐ使えます。データはクラウドに保存されているので引き継がれます。
          </p>
        </details>
      </Card>
    </div>
  );
}

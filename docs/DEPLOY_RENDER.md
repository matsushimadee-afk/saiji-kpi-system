# デプロイ手順書（Render＋Neon・無料・カード不要）

催事KPI管理システムを **クレジットカード登録なし・無料** で公開する手順です。
Render（アプリ本体）＋ Neon（無料Postgres）を使います。開発者向け・上から順にコピペで進められます。

## 構成

```
スマホ/PC ──HTTPS──▶ Render（Node: フロント＋API＋リアルタイム） ──▶ Neon（無料Postgres）
  出先から            自動でHTTPS/ドメイン付与               データはNeonに永続
```

- Render も Neon も **カード登録不要・無料**（GitHub/Google連携でサインアップ）
- **クセ**：Render無料は15分アクセスが無いと**スリープ**→次に開く人だけ**初回30〜60秒**待ち（使っている間は起きたまま。§9に対策あり）
- 初回デプロイ時、**DBの初期化＋名簿取り込みは自動**で走ります（シェル操作不要）

---

## 0. 事前に用意するもの
- **GitHub アカウント**（無料・カード不要）… コードの置き場所。Renderはここから読み込みます
- **Neon アカウント**（無料・カード不要）
- **Render アカウント**（無料・カード不要）
- **Google OAuth クライアントID**（[GOOGLE_LOGIN_SETUP.md](GOOGLE_LOGIN_SETUP.md)。承認済みJS生成元は §8 で本番URLを追加）
- 開発PCに **Git**（無ければ https://git-scm.com/ から）

---

## 1. コードを GitHub に上げる
開発PC（PowerShell）で、プロジェクトフォルダにて：
```powershell
cd C:\Users\user\saiji-kpi-system
git init
git add .
git commit -m "initial"
```
GitHub で **private リポジトリ**（例 `saiji-kpi-system`）を作成し、表示されたURLで：
```powershell
git remote add origin https://github.com/<あなたのユーザー>/saiji-kpi-system.git
git branch -M main
git push -u origin main
```
> `.gitignore` 済みなので **node_modules や .env（秘密情報）は push されません**。安心してpushできます。

---

## 2. Neon で無料Postgresを作成
1. https://neon.tech/ に GitHub/Google でサインアップ（カード不要）
2. 「Create project」→ 名前 `saiji-kpi`、リージョンは近い所（例 Tokyo / ap-southeast など）
3. 作成後に表示される **接続文字列（Connection string）** をコピー
   - 形式: `postgresql://ユーザー:パスワード@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`
   - これを後で `DATABASE_URL` に使います（`?sslmode=require` まで含めてコピー）

---

## 3. Render でアプリを作成（Blueprint）
リポジトリ直下に `render.yaml` を用意済みなので、Blueprintで一発です。
1. https://render.com/ に GitHub でサインアップ（カード不要）
2. 「New +」→「**Blueprint**」→ §1でpushしたリポジトリを選択
3. Render が `render.yaml` を読み込み、以下を自動設定：
   - Build: `npm install --include=dev && npm run build -w client`
   - Start: `npm run start`
   - プラン: **Free**
   - `JWT_SECRET` は自動生成
4. **入力を求められる環境変数**を設定：
   - `DATABASE_URL` … §2でコピーしたNeonの接続文字列
   - `GOOGLE_CLIENT_ID` … GoogleのクライアントID
5. 「Apply」→ デプロイ開始

> Blueprintを使わない場合は「New +」→「Web Service」→ リポジトリ選択 →
> Build/Start コマンドと環境変数（`NODE_ENV=production`, `SERVE_CLIENT=true`,
> `DB_CLIENT=pg`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=12h`,
> `GOOGLE_CLIENT_ID`, `ROSTER_SHEET_ID`）を手入力でも同じです。

---

## 4. 初回デプロイ（自動セットアップ）
デプロイが進むと、初回起動時に自動で：
1. テーブル作成（マイグレーション）
2. 初期データ投入（7つのKPI＋6つの転換率＋緊急用admin）
3. Googleシート名簿の取り込み（催事メンバー等）

が実行されます（**手動のシード操作は不要**）。
ログに `[bootstrap] 空のDBを検出 → 初期データを投入します` が出ればOK。

デプロイ完了後、Renderが **公開URL** を割り当てます（例: `https://saiji-kpi.onrender.com`）。

---

## 5. 動作確認（1回目）
`https://<あなたのアプリ>.onrender.com` を開く：
- まず **緊急用ログイン**（admin / `admin1234`）で画面が出ればサーバー＆DBは正常
- ※ Googleログインは §8 を済ませてから

---

## 6〜8. Googleログインを本番URLで有効化
1. Render のアプリURL（例 `https://saiji-kpi.onrender.com`）を控える
2. Google Cloud → 認証情報 → 対象のOAuthクライアントID →
   「**承認済みの JavaScript 生成元**」に **そのURL** を追加（https, 末尾スラッシュなし）
3. 数分待って、`https://<アプリ>.onrender.com` で「Googleでログイン」→ 催事メンバーのGmailでログイン確認

（`GOOGLE_CLIENT_ID` は §3で設定済み。詳細は [GOOGLE_LOGIN_SETUP.md](GOOGLE_LOGIN_SETUP.md)）

---

## 9.（任意）スリープによる初回待ちを減らす
無料プランは15分無アクセスでスリープします。頻繁に使う時間帯だけでも起こしておきたい場合：
- **UptimeRobot**（無料・カード不要）等で `https://<アプリ>.onrender.com/health` を5〜10分ごとに監視（ping）すると起きたままにできます。
- 注意：Render無料は月あたりの稼働時間上限があるため、常時起こし続けると月末に上限へ達することがあります。**イベント開催日だけ有効化**する運用がおすすめ。

---

## 10. キントーン日報連携を本番で有効にする

トークンが未設定のうちは、入力画面に「日報を提出」ボタンが**出ません**（安全側の設計）。本番で使うには2つ設定します。

**① Render に APIトークンを登録**
1. [Render ダッシュボード](https://dashboard.render.com/) → サービス **saiji-kpi** を開く
2. 左メニュー「**Environment**」→「**Add Environment Variable**」
3. Key に `KINTONE_API_TOKEN`、Value に キントーンのAPIトークンを貼り付け
4. 「**Save Changes**」→ 自動で再デプロイ（数分）。完了後に画面を再読み込み

（`KINTONE_SUBDOMAIN=deedrive` / `KINTONE_APP_ID=462` は render.yaml に入っているので通常は不要。別アプリに向ける時だけ同じ手順で追加）

**② 営業担当の「キントーンユーザー」を設定**
名簿シート（Googleシート）に **「キントーンユーザー名」列** を用意すれば、名簿同期で自動的に設定されます。
- 管理者でログイン → マスタ管理 → 営業担当 →「⟳ Googleシートから同期」を押すと、各メンバーの「キントーンユーザー」欄がシートの値で更新されます。
- 当社の場合、キントーンのログイン名は日本語の氏名そのもの（例: `森野茜`）なので、氏名をそのまま列に入れておけばOKです。
- 未設定（列が空）の人は日報提出時にエラーになります。
> マスタ画面で手入力もできますが、**次回の同期でシートの値に上書き**されます。恒久的に変えたいときはシートの列を直してください。

**動作確認**: 営業でログイン → 入力画面 →「日報を提出」→ キントーンの編集画面が開けばOK（当日の数値が入った状態で開くので、気付き欄を書いて保存）。

> ローカルで試すときは `server/.env` に `KINTONE_API_TOKEN` を書き、`npm run kintone:discover`（フィールド確認）や
> `npx tsx src/scripts/kintoneTestSubmit.ts <氏名> <YYYY-MM-DD>`（1件テスト登録）が使えます。
> テスト登録は**本番のキントーンにレコードが増える**ので、確認後は手動で削除してください。

---

## 運用メモ

### コードを更新したとき
GitHub に push するだけで **Render が自動で再デプロイ**します。
```powershell
git add . ; git commit -m "update" ; git push
```
（DBに既にデータがあれば初期化はスキップされ、データは保持されます）

### 名簿（催事メンバー）を最新化
管理者でログイン → マスタ管理 → 営業担当 →「⟳ Googleシートから同期」

### ログ
Render のダッシュボード → 対象サービス →「Logs」

### バックアップ
Neon のダッシュボードにバックアップ/リストア機能あり（無料枠でも直近の復元が可能）。

---

## つまずき早見表
| 症状 | 対処 |
|------|------|
| ビルドが `vite: not found` で失敗 | Build コマンドに `--include=dev` があるか確認（render.yaml済み） |
| 起動が `DATABASE_URL` エラー | Neonの接続文字列を丸ごと（`?sslmode=require`まで）設定したか確認 |
| Googleボタンが出ない | `GOOGLE_CLIENT_ID` 未設定。Renderの環境変数を確認→再デプロイ |
| 「日報を提出」ボタンが出ない | `KINTONE_API_TOKEN` 未設定。§10①を確認→再デプロイ |
| 提出時に「キントーンユーザーが未設定」 | マスタ管理→営業担当で本人の「キントーンユーザー」欄を入力（§10②） |
| `origin is not allowed`（Google） | 承認済みJS生成元にRenderの本番URL（https）を完全一致で追加 |
| ログインが拒否される | そのGmailが名簿に無い/退職/無効。マスタで確認し再同期 |
| 初回アクセスが遅い | スリープからの復帰（正常）。§9で軽減可 |
| データを最初からやり直したい | Neonでテーブルを全削除 → Renderを再デプロイ（空DB検出で自動再セットアップ） |

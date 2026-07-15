# Googleログイン セットアップ手順

Googleログインを有効化するには、Google Cloud で **OAuth クライアントID** を1つ作成し、
サーバーの環境変数に設定します（所要 5〜10分）。**Client ID は公開情報**で、秘密鍵の管理は不要です。

> 現状は `GOOGLE_CLIENT_ID` が未設定のため、ログイン画面は「管理者ログイン（緊急用）」のみ表示されます。
> 下記を設定するとログイン画面に「Googleでログイン」ボタンが表示されます。

---

## 1. Google Cloud プロジェクトを用意
1. https://console.cloud.google.com/ にアクセス（会社の Google アカウントで）
2. 上部のプロジェクト選択 →「新しいプロジェクト」→ 例: `saiji-kpi` を作成

## 2. OAuth 同意画面を設定
1. 左メニュー「API とサービス」→「OAuth 同意画面」
2. User Type = **外部（External）** を選択して作成
3. アプリ名（例: 催事KPI管理）、ユーザーサポートメール、デベロッパー連絡先を入力
4. スコープはデフォルト（`email` / `profile` / `openid`）のままでOK
5. **公開ステータス**：
   - 手早く使うなら「テストユーザー」に催事メンバーのGmailを追加（最大100名）
   - もしくは「アプリを公開（本番）」→ email/profile/openid のみなら Google の審査不要で利用可

## 3. OAuth クライアントID を作成
1. 「API とサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類 = **ウェブ アプリケーション**
3. 名前 = 例: `催事KPI Web`
4. **承認済みの JavaScript 生成元** に以下を追加（末尾スラッシュなし・完全一致）
   - 開発: `http://localhost:5173`
   - 本番: 実際に配信するURL（例: `https://kpi.example.com`）
   - ※このボタン方式（IDトークン）では「承認済みのリダイレクトURI」は不要です
5. 作成すると表示される **クライアント ID**（`xxxxxxxx.apps.googleusercontent.com`）をコピー

## 4. サーバーに設定
`server/.env` を編集：
```
GOOGLE_CLIENT_ID=ここに貼り付け.apps.googleusercontent.com
```
サーバーを再起動（`npm run dev:server`）。ログイン画面に「Googleでログイン」が出ます。

## 5. 名簿を同期してログインを許可
Googleログインは **名簿(usersマスタ)に在籍で登録されたGmailのみ許可** します。
1. 初回ブートストラップ（まだ誰もログインできない時）: `npm run sync:roster`
2. 以降は 管理者で「マスタ管理 → 営業担当 →『⟳ Googleシートから同期』」ボタン

## 6. 動作確認
1. ログイン画面で「Googleでログイン」→ 催事メンバーのGmailで認証
2. 名簿に在籍で存在すればログイン成功、無ければ「名簿に登録されていません」で拒否

---

## よくあるハマりどころ
| 症状 | 原因・対処 |
|------|-----------|
| ボタンが出ない | `GOOGLE_CLIENT_ID` 未設定 or サーバー未再起動。`/api/auth/config` で確認 |
| `origin is not allowed` | 「承認済みの JavaScript 生成元」に現在のURL（scheme+host+port）を完全一致で追加 |
| ログインが拒否される | そのGmailが名簿に無い/退職(TRUE)/無効。名簿を確認し再同期 |
| `access_blocked`（テスト中） | 同意画面の「テストユーザー」にそのGmailを追加、または本番公開 |

## メールが一致する必要あり
名簿(シート)の Gmail と、実際にログインするGoogleアカウントのメールが**完全一致**する必要があります。
（本システムはメールでユーザーを突合します）

# API 一覧

ベースURL: `/api`　認証: `Authorization: Bearer <JWT>`（ログイン以外は必須）

権限凡例: 🟢 全ロール / 🟡 責任者・管理者 / 🔴 管理者のみ

## 認証

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/auth/config` | 公開 | `{googleEnabled, googleClientId}`（フロントがGoogleボタン表示に使用） |
| POST | `/auth/google` | 公開 | Googleログイン。`{credential}`(IDトークン) → `{token, user}`。名簿(email)に在籍で存在する場合のみ許可 |
| POST | `/auth/login` | 公開 | 社員ID/パスワード（管理者の緊急用）。`{employeeId, password}` → `{token, user}` |
| GET | `/auth/me` | 🟢 | 現在のユーザー情報 |

## 名簿同期（Googleシート）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| POST | `/roster/sync` | 🔴 | Googleシートの名簿を営業担当マスタへ同期。`{created, updated, deactivated, people[]}` を返す |

> CLI からも実行可: `npm run sync:roster`（Googleログイン導入直後のブートストラップ用）。

## KPI入力（営業担当画面）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| POST | `/entries` | 🟢 | KPI +1。`{kpiId, venueId?}`。Socket通知を発火 |
| POST | `/entries/undo` | 🟢 | 自分の当日直近入力を1件取消 |
| GET | `/entries/summary/me?date=` | 🟢 | 自分の当日サマリ（件数・目標・達成率） |

## 集計（ダッシュボード）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/stats/daily?date=` | 🟡 | デイリー集計（全体件数・営業/会場/部署ランキング・KPI達成率・時間帯別推移） |
| GET | `/stats/monthly?month=` | 🟡 | 当月集計（累計・各ランキング・達成率・進捗） |

> 責任者は自部署に自動スコープ、管理者は全社。

## マスタ: 営業担当（users）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/users?departmentId=&status=` | 🟡 | 一覧（責任者は自部署のみ） |
| GET | `/users/:id` | 🟡 | 単体取得 |
| GET | `/users/:id/history` | 🟡 | 所属履歴 |
| POST | `/users` | 🔴 | 追加 |
| PUT | `/users/:id` | 🔴 | 更新（所属変更時は履歴を自動記録） |
| DELETE | `/users/:id` | 🔴 | 削除 |

## マスタ: KPI（kpis）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/kpis?includeInactive=` | 🟢 | 一覧 |
| POST | `/kpis` | 🔴 | 追加 |
| PUT | `/kpis/:id` | 🔴 | 更新 |
| DELETE | `/kpis/:id` | 🔴 | 削除 |

## マスタ: 転換率（rates / 数値項目）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/rates?includeInactive=` | 🟢 | 転換率定義の一覧 |
| POST | `/rates` | 🔴 | 追加（`{name, numeratorKpiId, denominatorKpiId, displayOrder?, isActive?}`） |
| PUT | `/rates/:id` | 🔴 | 更新 |
| DELETE | `/rates/:id` | 🔴 | 削除 |

> 転換率 = 分子KPI件数 ÷ 分母KPI件数。`/entries/summary/me`・`/stats/daily`・`/stats/monthly` のレスポンスに計算済みの `rates` が含まれます。

## マスタ: 会場（venues）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/venues?onlyActive=` | 🟢 | 一覧 |
| POST | `/venues` | 🔴 | 追加 |
| PUT | `/venues/:id` | 🔴 | 更新 |
| DELETE | `/venues/:id` | 🔴 | 削除 |

## マスタ: 部署・チーム（org）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/org/departments` | 🟢 | 部署一覧 |
| POST/PUT/DELETE | `/org/departments/:id?` | 🔴 | 部署 追加/更新/削除 |
| GET | `/org/teams` | 🟢 | チーム一覧 |
| POST/PUT/DELETE | `/org/teams/:id?` | 🔴 | チーム 追加/更新/削除 |

## マスタ: 目標（targets）

| メソッド | パス | 権限 | 説明 |
|----------|------|------|------|
| GET | `/targets?periodType=&scope=` | 🟡 | 一覧 |
| POST | `/targets` | 🔴 | UPSERT（`period_type,scope,scope_id,kpi_id` 単位） |
| DELETE | `/targets/:id` | 🔴 | 削除 |

## リアルタイム（Socket.io）

- 接続: `io({ auth: { token } })`（JWT必須）
- サーバー→クライアント: `kpi:update`
  ```ts
  { type: 'created' | 'undone', entryId, userId, kpiId, venueId, departmentId, entryDate, month }
  ```
  クライアントは通知を受けて、自分の権限に応じた集計を再取得します。

## その他

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/health` | ヘルスチェック `{status:'ok'}` |

## エラー形式

```json
{ "error": { "message": "…", "code": "BAD_REQUEST", "details": {} } }
```
主なステータス: 400 入力不正 / 401 未認証 / 403 権限不足 / 404 不在 / 409 重複。

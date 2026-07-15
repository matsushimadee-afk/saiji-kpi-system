# 今後の拡張方法

本システムは **マスタ中心設計** のため、日常的な追加（KPI・部署・会場・目標・担当者）は
**コード変更なし・画面操作だけ** で完結します。機能追加も決まった型に沿って最小差分で行えます。

---

## 1. コード変更なしでできること（運用）

| やりたいこと | 操作 |
|--------------|------|
| KPIを追加/削除/並べ替え/色変更 | マスタ管理 → KPI |
| 部署・チームを追加 | マスタ管理 → 部署・チーム |
| 会場を追加 | マスタ管理 → 会場 |
| 担当者の追加・**異動** | マスタ管理 → 営業担当（所属変更は履歴に自動記録） |
| 日次/月次の目標変更（全体/部署/個人/会場別） | マスタ管理 → 目標 |

KPIを1つ増やしても、営業画面のボタン・ダッシュボードの集計・ランキングの内訳は
`kpis` テーブルを参照して**自動生成**されるため、画面改修は不要です。

---

## 2. 新しいマスタ／機能を足す時の「型」

例として **商材別管理（products）** を追加する手順。すべてのマスタ追加はこの流れです。

### ① 共有型を追加（`shared/index.ts`）
```ts
export interface Product { id: number; name: string; isActive: boolean; /* ... */ }
```

### ② マイグレーション（`server/src/db/migrations/xxxx_add_products.ts`）
```ts
export async function up(knex) {
  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  // KPI入力に商材を紐付ける場合
  await knex.schema.alterTable('kpi_entries', (t) => {
    t.integer('product_id').references('id').inTable('products');
  });
}
```

### ③ モジュール追加（`server/src/modules/products/`）
`products.service.ts`（CRUD）+ `products.routes.ts`。既存の `venues` モジュールをコピーするのが最短。

### ④ ルート登録（`server/src/routes.ts`）
```ts
apiRouter.use('/products', productsRouter);
```

### ⑤ フロント: API + 画面
- `client/src/api/endpoints.ts` に `productApi` を追加
- `client/src/features/masters/ProductMaster.tsx`（`VenueMaster.tsx` をコピー）
- `MastersLayout.tsx` の `SUB_NAV` に1行追加

集計に商材ディメンションを足す場合は `stats.service.ts` に `productRanking()` を1つ追加するだけ
（`venueRanking` と同じ形）。

---

## 3. 想定済みの将来機能と実装の勘所

| 機能 | 実装方針 |
|------|----------|
| **商材別管理** | 上記の手順。`kpi_entries.product_id` を追加し、営業画面に商材セレクタ（会場セレクタと同型）、集計に商材ランキングを追加 |
| **CSV / Excel 出力** | `stats` に `GET /stats/export?type=daily&format=csv` を追加し、集計結果を CSV 整形して返す。Excel は `exceljs` で xlsx 生成。フロントは Blob ダウンロード |
| **Power BI 連携** | 集計用の読み取り専用 REST（またはDBビュー）を用意。PostgreSQL 移行後は Power BI から直接接続も可 |
| **kintone 連携** | `kpi_entries` 保存時（`entries.service.createEntry`）にフックを追加し kintone REST API へ非同期push。逆同期はバッチ |
| **LINE WORKS 通知** | 目標達成・日次締めのタイミングで通知。`realtime` と同様に通知サービスを1つ追加し、`entries`/バッチから呼ぶ |
| **YOOM 連携** | Webhook 受信エンドポイント（`/integrations/yoom`）を足し、イベント駆動で連携 |
| **AI分析** | 集計API/DBを入力に、別サービスで分析。`stats` の集計関数を再利用 |
| **営業コメント** | `entry_comments` テーブル + `comments` モジュール。営業画面/ダッシュボードにコメント欄 |
| **ランキング表彰画面** | `RankingCard` を流用した表彰用ページ（`/awards`）。既存の `stats/daily` `stats/monthly` をそのまま利用 |
| **テレビモニター表示モード** | `/tv` ルートを追加し、ダッシュボードのデータを大画面レイアウトで表示。Socket購読はそのまま使える |

いずれも **既存の集計ロジック・型・UIコンポーネントを再利用** でき、影響範囲が局所化されるよう設計しています。

---

## 4. PostgreSQL への移行

1. `server/.env` を変更
   ```
   DB_CLIENT=pg
   DATABASE_URL=postgres://user:pass@host:5432/kpi
   ```
2. `npm i pg -w server`
3. `npm run db:migrate && npm run db:seed`

クエリは Knex 経由のため、アプリコードの変更はほぼ不要です。
（SQLite固有だった時刻処理は `created_at` をローカル時刻文字列で保存する実装に統一済み。
本番では列型を `timestamptz` にしてタイムゾーンを明示するのも可。）

---

## 5. 設計上の指針（改修時の道しるべ）

- **KPI/部署/会場/目標はデータ**。増減で画面ロジックを変えない。
- **入力は1レコード**、Undoは論理削除。集計は `SUM(amount) WHERE is_active`。
- **所属はスナップショット**（`kpi_entries.department_id/team_id`）。異動が過去集計を壊さない。
- **権限はサーバーで強制**（`authorize` + `stats` のスコープ解決）。フロントの出し分けは補助。
- **型は `shared` に集約**。API・画面・DBマッパーが同じ型を共有し、齟齬を防ぐ。
- **機能はモジュール単位**（`server/src/modules/*`, `client/src/features/*`）で自己完結。

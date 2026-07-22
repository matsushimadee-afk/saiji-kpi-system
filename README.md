# 催事販路専用 リアルタイムKPI管理システム

営業担当が現場で **1タップ** でKPIを入力し、責任者・管理者が **リアルタイム** で全体状況を把握するための社内システムです。マスタ中心設計により、KPI・部署・会場・目標をコードを修正せず画面から追加・変更できます。

---

## 技術構成

| 領域 | 技術 |
|------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| バックエンド | Node.js + Express + TypeScript |
| リアルタイム | Socket.io |
| DB | SQLite（開発） / PostgreSQL（本番想定） ※ Knex で切替 |
| 認証 | JWT + bcrypt |
| 型共有 | npm workspaces（`shared` パッケージを双方が参照） |

スマートフォン最優先のレスポンシブ設計・ダークモード対応。

---

## セットアップ

前提: **Node.js 18 以上（推奨 20/22 LTS）**

```bash
# 1. 依存関係のインストール + DB初期化（マイグレーション + デモデータ投入）
npm run setup

# 2. サーバー & クライアントを同時起動
npm run dev
```

- フロント: http://localhost:5173
- API: http://localhost:4000

> 個別起動する場合は `npm run dev:server` / `npm run dev:client`。

### ログイン方式

- **Googleログイン**（本番の主方式）: 名簿(Googleシート)に在籍で登録された Gmail のみログイン可。
  設定手順は [docs/GOOGLE_LOGIN_SETUP.md](docs/GOOGLE_LOGIN_SETUP.md)。`GOOGLE_CLIENT_ID` 未設定の間はボタン非表示。
- **管理者ログイン（緊急用）**: 社員ID/パスワード。Google未設定・障害時のロックアウト防止用。

### 名簿(Googleシート)同期

催事メンバー等を名簿シートから取り込みます（販路=催事→営業担当 / 責任者・閲覧のみ→責任者 / 開発者→管理者）。

```bash
npm run sync:roster        # CLI（初回ブートストラップ用）
```

管理画面からは「マスタ管理 → 営業担当 →『⟳ Googleシートから同期』」。退職(TRUE)・名簿外は自動で無効化されます。

### KPI構成（初期設定済み）

**カウンター項目（7）**: キャッチ数 → 電力会社ヒアリング数(シール) → 抽選数 → アンケート数 → 商談数(着座) → 会社案内アウト → 受注数

**転換率（数値項目・自動計算 6）**:

| 転換率 | 計算 |
|--------|------|
| 電力会社ヒアリング率 | 電力会社ヒアリング数 ÷ キャッチ数 |
| 抽選率 | 抽選数 ÷ 電力会社ヒアリング数 |
| アンケート率 | アンケート数 ÷ 抽選数 |
| 商談率 | 商談数 ÷ アンケート数 |
| 会社案内アウト率 | 会社案内アウト ÷ 商談数 |
| 受注率 | 受注数 ÷ 商談数 |

いずれも「マスタ管理 → KPI / 転換率」から画面で追加・変更できます。

### デモアカウント（緊急用ログインで利用可）

| 権限 | 社員ID | パスワード |
|------|--------|-----------|
| 管理者 | `admin` | `admin1234` |
| 責任者（東日本） | `manager1` | `pass1234` |
| 営業担当 | `sales1`〜`sales5` | `pass1234` |

---

## npm スクリプト

| コマンド | 内容 |
|----------|------|
| `npm run setup` | install + DB作り直し |
| `npm run dev` | サーバー & クライアント同時起動 |
| `npm run dev:server` | バックエンドのみ |
| `npm run dev:client` | フロントエンドのみ |
| `npm run db:migrate` | マイグレーション適用 |
| `npm run db:seed` | シード投入 |
| `npm run db:reset` | ロールバック→マイグレーション→シード |
| `npm run sync:roster` | Googleシート名簿を営業担当マスタへ同期 |
| `npm run sample:entries` | デモ用: 営業担当に本日のサンプル入力を生成（動作確認用） |
| `npm run build` | 本番ビルド（server + client） |

---

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/DATABASE.md](docs/DATABASE.md) | ER図・テーブル構成 |
| [docs/API.md](docs/API.md) | API一覧 |
| [docs/SCREENS.md](docs/SCREENS.md) | 画面一覧 |
| [docs/GOOGLE_LOGIN_SETUP.md](docs/GOOGLE_LOGIN_SETUP.md) | Googleログイン設定手順 |
| [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) | クラウド公開手順（**Render＋Neon・無料・カード不要**） |
| [docs/DEPLOY_ORACLE.md](docs/DEPLOY_ORACLE.md) | クラウド公開手順（Oracle無料VM・常時稼働） |
| [docs/EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md) | 今後の拡張方法 |

---

## ディレクトリ構成

```
saiji-kpi-system/
├── package.json              # npm workspaces ルート
├── shared/                   # サーバー/クライアント共有の型定義
│   └── index.ts
├── server/                   # バックエンド
│   ├── src/
│   │   ├── index.ts          # エントリ（HTTP + Socket.io 起動）
│   │   ├── app.ts            # Express アプリ組み立て
│   │   ├── routes.ts         # /api ルート集約
│   │   ├── config/           # env / database(Knex)
│   │   ├── db/
│   │   │   ├── migrations/   # スキーマ定義
│   │   │   ├── seeds/        # 初期データ
│   │   │   └── cli.ts        # migrate/seed/reset CLI
│   │   ├── middleware/       # auth / authorize / errorHandler
│   │   ├── modules/          # 機能別（下記）
│   │   │   ├── auth/
│   │   │   ├── users/        # 営業担当マスタ
│   │   │   ├── org/          # 部署・チーム
│   │   │   ├── kpis/         # KPIマスタ
│   │   │   ├── venues/       # 会場マスタ
│   │   │   ├── targets/      # 目標マスタ + 目標解決ロジック
│   │   │   ├── entries/      # KPI入力 + Undo + 当日サマリ
│   │   │   ├── stats/        # 集計（デイリー/当月）
│   │   │   └── roster/       # Googleシート名簿の同期
│   │   ├── scripts/          # sync:roster などのCLI
│   │   ├── realtime/         # Socket.io
│   │   └── utils/            # 共通ユーティリティ
│   └── data/                 # SQLite ファイル（自動生成）
└── client/                   # フロントエンド
    └── src/
        ├── main.tsx / App.tsx / router.tsx
        ├── styles/           # デザイントークン + 共通コンポーネントCSS
        ├── api/              # axios クライアント + エンドポイント
        ├── store/            # 認証 / テーマ（Zustand）
        ├── realtime/         # Socket.io クライアント
        ├── lib/              # 汎用ヘルパ
        ├── components/
        │   ├── ui/           # 汎用UI（Button, Card, Modal ...）
        │   ├── layout/       # AppShell, ナビ, テーマ切替
        │   └── auth/         # ルートガード
        └── features/         # 画面（機能別）
            ├── auth/         # ログイン
            ├── sales/        # 営業担当画面
            ├── dashboard/    # 責任者ダッシュボード
            └── masters/      # マスタ管理
```

---

## 権限モデル

| 権限 | できること |
|------|-----------|
| 営業担当 (sales) | 自分のKPI入力・自分の当日サマリ閲覧 |
| 責任者 (manager) | 自部署のダッシュボード・マスタ閲覧 |
| 管理者 (admin) | 全データ閲覧・マスタ編集・目標編集 |

集計APIはサーバー側で権限に応じてスコープを強制します（責任者は自部署のみ）。

---

## 本番（PostgreSQL）への移行

`server/.env` を次のように変更するだけでDBエンジンを切り替えられます（Knex がクエリを吸収）。

```
DB_CLIENT=pg
DATABASE_URL=postgres://user:pass@host:5432/kpi
```

その後 `npm run db:migrate && npm run db:seed`。詳細は [docs/EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md)。

# デプロイ手順書（Oracle Cloud 無料VM・常時稼働）

催事KPI管理システムを **完全無料・常時稼働** で公開する手順です。開発者向けに、上から順にコピペで進められるようにしています。所要時間はおおよそ **1〜2時間**。

## 完成イメージ（構成）

```
スマホ/PC ──HTTPS──▶ Caddy(80/443) ──▶ Node サーバー(4000) ──▶ SQLite(VMのディスク)
  出先から             自動で証明書取得        フロント＋API＋            データはVMに永続
                       ・更新                  リアルタイム(Socket.io)
```

- Node サーバー1つが「フロント配信＋API＋リアルタイム」を担当（本番は1サービス構成）
- Caddy が HTTPS を自動化（Googleログインに https 必須）
- データは VM のディスク上の SQLite に永続（無料枠でも消えない）

---

## 0. 事前に用意するもの
- **Oracle Cloud アカウント**（無料。クレジットカード登録は本人確認用で、Always Free枠は課金されません）
- **無料ドメイン**（DuckDNS。手順は §5）
- **Google OAuth クライアントID**（[GOOGLE_LOGIN_SETUP.md](GOOGLE_LOGIN_SETUP.md) 参照。承認済みJS生成元は後述の本番ドメインを登録）
- **SSH鍵**（WindowsのPowerShellで `ssh-keygen -t ed25519` → `~/.ssh/id_ed25519.pub` の中身を使用）

---

## 1. VM（無料インスタンス）を作成
Oracle Cloud コンソール → 「Compute」→「インスタンス」→「インスタンスの作成」

- **名前**: `kpi`
- **イメージ**: Canonical **Ubuntu 22.04**
- **シェイプ**: 「シェイプの変更」→
  - 第一候補 **Ampere / VM.Standard.A1.Flex**（ARM, 例: 2 OCPU / 12GB）※Always Free枠
  - もし「Out of capacity」なら **VM.Standard.E2.1.Micro**（AMD, 1 OCPU / 1GB）※こちらもAlways Free（1GBなので §7 でスワップ追加）
- **SSH鍵**: 「公開キーの貼り付け」に `id_ed25519.pub` の内容を貼る
- 作成後、表示される **パブリックIPアドレス** を控える（例: `123.45.67.89`）

---

## 2. ネットワークのポート開放（80/443）
2箇所で開けます。**両方**必要です。

### (a) Oracle 側（セキュリティリスト）
インスタンス → 「仮想クラウド・ネットワーク」→ 該当VCN → 「セキュリティリスト」→ 「イングレス・ルールの追加」を2本：
| ソースCIDR | プロトコル | ポート |
|---|---|---|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |

### (b) VM内（iptables）— SSH接続後（§3）に実行
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 3. SSH接続
Windows の PowerShell から：
```powershell
ssh -i $HOME\.ssh\id_ed25519 ubuntu@123.45.67.89   # ← IPは自分のVM
```
（ここから先のコマンドはすべてVM上で実行）

---

## 4. 必要ソフトを導入（Node / git / Caddy）
```bash
# システム更新
sudo apt update && sudo apt -y upgrade

# Node.js 22 + ビルドツール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git build-essential python3
node -v   # v22.x を確認

# Caddy（自動HTTPS リバースプロキシ）
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## 5. 無料ドメイン（DuckDNS）を設定
1. https://www.duckdns.org/ にGoogle等でログイン
2. 好きなサブドメインを作成（例: `kpi-deedrive` → `kpi-deedrive.duckdns.org`）
3. **current ip** にVMのパブリックIP（例 `123.45.67.89`）を入れて更新

> 反映確認（VM上）: `ping kpi-deedrive.duckdns.org` でVMのIPが返ればOK。

---

## 6. コードをVMに配置
**方法A（推奨・更新が楽）: GitHub 経由**
1. 開発PCでプロジェクトを private リポジトリとして GitHub にpush
   （`saiji-kpi-system` フォルダで `git init` → commit → push。`.gitignore` 済みなので node_modules は含まれません）
2. VMで clone：
```bash
cd ~
git clone https://github.com/<あなたのユーザー>/saiji-kpi-system.git
cd saiji-kpi-system
```

**方法B（手早い）: 直接アップロード**
開発PCの PowerShell から（node_modules を除いて転送）:
```powershell
scp -i $HOME\.ssh\id_ed25519 -r `
  (Get-ChildItem "C:\Users\user\saiji-kpi-system" -Exclude node_modules,dist,data) `
  ubuntu@123.45.67.89:~/saiji-kpi-system/
```

---

## 7. （AMD 1GBの場合のみ）スワップ追加
ARM(12GB)なら不要。AMD Micro(1GB)は npm install/build がメモリ不足になりやすいので：
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 8. 依存導入 ＋ フロントをビルド
```bash
cd ~/saiji-kpi-system
npm install
npm run build -w client     # client/dist を生成（本番フロント）
```

---

## 9. 環境変数を設定（server/.env）
```bash
cp deploy/.env.production.example server/.env
# ランダムなJWT鍵を生成して差し込む
SECRET=$(openssl rand -hex 32)
sed -i "s/REPLACE_WITH_RANDOM_64_CHARS/$SECRET/" server/.env
# エディタで残りを編集
nano server/.env
```
`server/.env` で以下を自分の値に：
```
CLIENT_ORIGIN=https://kpi-deedrive.duckdns.org
GOOGLE_CLIENT_ID=（Google Cloudで作成したクライアントID）
```
（`SERVE_CLIENT=true` / `DB_FILE=./data/kpi.sqlite` はそのままでOK）

---

## 10. DBを初期化 ＋ 名簿を取り込み
```bash
cd ~/saiji-kpi-system
npm run db:reset        # 7つのKPI＋6つの転換率＋催事部署＋緊急用admin を投入
npm run sync:roster     # Googleシート名簿から催事メンバー等を取り込み
```
> ⚠️ `npm run sample:entries`（デモ入力生成）は本番では実行しないこと。

---

## 11. 常時稼働（systemd 登録）
```bash
# ユーザー/パスをsystemdファイルに合わせる（ubuntu / ホームに置いた場合はそのまま）
sudo cp deploy/kpi.service /etc/systemd/system/kpi.service
sudo systemctl daemon-reload
sudo systemctl enable --now kpi
sudo systemctl status kpi --no-pager      # active (running) を確認
curl -s localhost:4000/health             # {"status":"ok"} を確認
```
> 配置先が `~/saiji-kpi-system` 以外の場合、`/etc/systemd/system/kpi.service` の
> `User=` と `WorkingDirectory=`（…/server を指す）を実際のパスに修正してから `daemon-reload`。

---

## 12. Caddy（HTTPS）を設定
```bash
# ドメインを自分のものに置き換えてCaddyfileを設置
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/your-domain.example.com/kpi-deedrive.duckdns.org/' /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```
数十秒で Let's Encrypt の証明書が自動取得されます（§2のポート開放と§5のDNSが前提）。

---

## 13. Google ログインを本番ドメインで有効化
Google Cloud → 認証情報 → 対象のOAuthクライアントID →
「**承認済みの JavaScript 生成元**」に本番URLを追加：
```
https://kpi-deedrive.duckdns.org
```
（localhostの分は残してOK。詳細は [GOOGLE_LOGIN_SETUP.md](GOOGLE_LOGIN_SETUP.md)）

---

## 14. 動作確認 🎉
スマホ／PCのブラウザで：
```
https://kpi-deedrive.duckdns.org
```
- 「Googleでログイン」→ 催事メンバーのGmailでログインできればOK
- 管理者は緊急用（admin / .envで設定したパスワード）でもログイン可
- 出先（モバイル回線）からも開けることを確認

---

## 運用メモ

### コードを更新したとき
```bash
cd ~/saiji-kpi-system
git pull                      # 方法Bの場合は再scp
npm install
npm run build -w client
sudo systemctl restart kpi
```

### 名簿（催事メンバー）を最新化
管理者でログイン → マスタ管理 → 営業担当 →「⟳ Googleシートから同期」
（またはVMで `npm run sync:roster`）

### ログを見る
```bash
journalctl -u kpi -f          # アプリのログ
journalctl -u caddy -f        # HTTPS/プロキシのログ
```

### バックアップ（データ＝SQLite 1ファイル）
```bash
# VM上でコピー（日付付き）
cp ~/saiji-kpi-system/server/data/kpi.sqlite ~/kpi-backup-$(date +%F).sqlite
# 手元PCに取得
# scp -i $HOME\.ssh\id_ed25519 ubuntu@123.45.67.89:~/saiji-kpi-system/server/data/kpi.sqlite .
```
定期バックアップは cron 等で自動化推奨。

---

## つまずきポイント早見表
| 症状 | 対処 |
|------|------|
| https で開けない/証明書が出ない | §2のポート開放（Oracle側＋iptables両方）と §5のDNS(IP一致)を確認。`journalctl -u caddy -f` |
| Googleボタンが出ない | `server/.env` の `GOOGLE_CLIENT_ID` 未設定 or サービス未再起動。`curl localhost:4000/api/auth/config` |
| `origin is not allowed`（Google） | 承認済みJS生成元に本番URL（https, 末尾スラッシュなし）を完全一致で追加 |
| ログインが拒否される | そのGmailが名簿に無い/退職/無効。名簿を確認し再同期 |
| `npm run build` が固まる/落ちる（AMD 1GB） | §7のスワップ追加 |
| ARMインスタンスが作れない | AMD Micro(E2.1.Micro)で作成 → §7スワップ |
| サービスが起動しない | `journalctl -u kpi -e` を確認。`kpi.service` の User/WorkingDirectory パスが実配置と一致しているか |

# Slack Post Reviewer

Slack の任意期間の投稿を取得・閲覧する Web アプリケーション

## 概要

このアプリケーションは、Slack OAuth 認証を使用して、指定した期間の Slack 投稿を検索・表示・エクスポートできるツールです。

### 主な機能

- 📅 期間指定で Slack 投稿を検索（年月選択または詳細な日付指定）
- 💬 チャンネル・DM・グループ DM ごとにフィルタリング可能
- 📊 チャンネル別にグループ化された投稿一覧表示
- 📥 取得データの JSON エクスポート
- 🔐 Slack OAuth 2.0 による安全な認証

## 技術スタック

- **フロントエンド**: React 19, Next.js 15, TailwindCSS 4
- **バックエンド**: Next.js App Router, Server-Sent Events (SSE)
- **認証**: iron-session
- **API**: @slack/web-api (Slack 公式 SDK)

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/eto-koshi24-fixer/slack-post-reviewer.git
cd slack-post-reviewer
```

### 2. 依存パッケージのインストール

```bash
pnpm install
```

### 3. ローカル開発用 SSL 証明書の生成

HTTPS が必要なため、mkcert を使用してローカル証明書を生成します。

#### mkcert のインストール

**Windows (winget):**

```bash
winget install FiloSottile.mkcert
```

**⚠️ インストール後、PC を再起動してください。**

再起動後、PowerShell またはコマンドプロンプトで以下を実行して動作確認:

```bash
mkcert -version
```

#### 証明書の生成

```bash
# ローカル認証局のインストール（初回のみ）
mkcert -install

# localhost用証明書の生成
mkcert localhost

# 以下のファイルが生成されます:
# - localhost.pem (証明書)
# - localhost-key.pem (秘密鍵)
```

### 5. 環境変数の設定

SharePoint から `.env.local` ファイルをダウンロードして、プロジェクトルートに配置してください。

**SharePoint**: [環境変数ファイルの場所のリンクをここに記載]

ダウンロード後、プロジェクトルートに配置:

```bash
# .env.local をプロジェクトルートに配置
# slack-post-reviewer/.env.local
```

### 6. 開発サーバーの起動

```bash
pnpm dev
```

```bash
$ pnpm dev

> slack-post-reviewer@0.1.0 dev C:\github\slack-post-reviewer
> node server.js

> Ready on https://localhost:3000
```

↑ が表示されたら、ブラウザで [https://localhost:3000](https://localhost:3000) にアクセスしてください。

## スクリプト

```bash
# 開発サーバー起動（HTTPS）
pnpm dev

# プロダクションビルド
pnpm build

# プロダクションサーバー起動
pnpm start

# Lintチェック
pnpm lint

# コードフォーマット（自動修正）
pnpm check:fix
```

## プロジェクト構成

```
slack-post-reviewer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/slack/      # Slack OAuth認証
│   │   │   ├── slack/           # Slackメッセージ取得API
│   │   │   └── user/            # ユーザー情報取得API
│   │   ├── layout.tsx           # レイアウトコンポーネント
│   │   └── page.tsx             # メインページ
│   ├── lib/
│   │   ├── session.ts           # セッション設定
│   │   └── slack.ts             # Slack APIクライアント
│   └── types/
│       └── slack.ts             # 型定義
├── server.js                     # HTTPSカスタムサーバー
├── .env.local                    # 環境変数（Git管理外）
├── localhost.pem                 # SSL証明書（Git管理外）
└── localhost-key.pem             # SSL秘密鍵（Git管理外）
```

## 使い方

1. **ログイン**: 「Slack にログイン」ボタンをクリック
2. **期間選択**: 年月モードまたは詳細モードで期間を指定
3. **メッセージタイプ選択**: チャンネル/グループ DM/DM から選択
4. **投稿取得**: 「投稿を取得」ボタンをクリック
5. **結果確認**: チャンネル別にグループ化された投稿を確認
6. **エクスポート**: 必要に応じて JSON ダウンロード

## 注意事項

- **処理速度**: 約 100 件あたり 20 秒程度かかります
- **タイムアウト時間**: 10 分でタイムアウトします
- **Rate Limit**: Slack API のレート制限に注意してください
- **HTTPS 必須**: Slack OAuth の仕様上、HTTPS が必要です

## トラブルシューティング

### SSL 証明書エラーが出る場合

```bash
# 証明書を再生成
rm localhost*.pem
mkcert localhost
```

### ポート 3000 が使用中の場合

[server.js](server.js#L21)の`.listen(3000, ...)`を別のポート番号に変更してください。

### Slack 認証が失敗する場合

1. Slack App の設定を確認
2. Redirect URL が正確に設定されているか確認
3. `.env.local`の環境変数を確認
4. ブラウザのキャッシュをクリア

## ライセンス

このプロジェクトはプライベートプロジェクトです。全ての依存パッケージは MIT ライセンスです。

## セキュリティ

- `.env.local`ファイルは絶対に公開リポジトリにコミットしないでください
- SSL 証明書ファイル（`.pem`, `.crt`, `.key`）もコミットしないでください
- `IRON_SESSION_PASSWORD`は十分に複雑な値を使用してください

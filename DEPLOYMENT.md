# 🚀 Vercelデプロイガイド

## 前提条件

- Vercelアカウント（[vercel.com](https://vercel.com)で無料登録）
- Google Gemini API キー（[Google AI Studio](https://makersuite.google.com/app/apikey)で取得）
- GitHubアカウント（推奨）

## デプロイ方法

### 方法1: Vercel CLIを使用（推奨）

1. **Vercel CLIのインストール**
```bash
npm install -g vercel
```

2. **ログイン**
```bash
vercel login
```

3. **プロジェクトのデプロイ**
```bash
cd /home/user/webapp
vercel
```

4. **環境変数の設定**
```bash
vercel env add GEMINI_API_KEY
# プロンプトに従って本番環境用のAPIキーを入力
```

5. **本番環境へのデプロイ**
```bash
vercel --prod
```

### 方法2: GitHub経由でデプロイ

1. **GitHubリポジトリの作成**
   - GitHub.comで新しいリポジトリを作成

2. **コードをプッシュ**
```bash
cd /home/user/webapp
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. **Vercelと連携**
   - [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
   - "Add New Project"をクリック
   - GitHubリポジトリを選択
   - "Import"をクリック

4. **環境変数の設定**
   - "Environment Variables"セクションで以下を追加:
     - `GEMINI_API_KEY`: あなたのGemini APIキー
   - "Deploy"をクリック

### 方法3: Vercel Dashboard経由

1. **プロジェクトをGitHubにプッシュ**（方法2の手順1-2参照）

2. **Vercel Dashboardで設定**
   - [vercel.com/new](https://vercel.com/new)にアクセス
   - リポジトリをインポート
   - 環境変数を設定
   - デプロイ

## 環境変数

デプロイ時に以下の環境変数を設定する必要があります：

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API キー | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | アプリケーションのURL | ❌ No（自動設定） |

## Gemini API キーの取得方法

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. Googleアカウントでログイン
3. "Get API Key"をクリック
4. "Create API Key"を選択
5. 生成されたAPIキーをコピー
6. Vercelの環境変数に設定

## デプロイ後の確認

1. **動作確認**
   - デプロイ完了後、Vercelから提供されるURLにアクセス
   - 例: `https://your-project.vercel.app`

2. **テスト**
   - URLを入力してスクレイピングが動作するか確認
   - 各ステップが正常に機能するか確認

3. **ログ確認**
   - Vercel Dashboardの"Logs"タブでエラーを確認
   - エラーがある場合は環境変数が正しく設定されているか確認

## トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドテスト
npm run build
```

### 環境変数が反映されない

1. Vercel Dashboardで環境変数を確認
2. 再デプロイを実行:
```bash
vercel --prod --force
```

### APIエラー

- Gemini API キーが有効か確認
- APIクォータを超えていないか確認
- [Google Cloud Console](https://console.cloud.google.com/)でAPI使用状況を確認

### パフォーマンスの最適化

1. **画像の最適化**
   - Next.js Image最適化が自動的に適用されます

2. **キャッシング**
   - Vercel Edge Networkが自動的にキャッシングを処理

3. **関数のタイムアウト**
   - デフォルト: 10秒
   - 必要に応じて`vercel.json`で調整可能

## カスタムドメインの設定

1. Vercel Dashboardでプロジェクトを選択
2. "Settings" → "Domains"
3. カスタムドメインを追加
4. DNSレコードを設定

## 継続的デプロイ（CD）

GitHubリポジトリと連携すると、自動的に継続的デプロイが設定されます：

- `main`ブランチへのプッシュ → 本番環境に自動デプロイ
- 他のブランチへのプッシュ → プレビュー環境に自動デプロイ

## サポート

問題が発生した場合：

1. [Vercel Documentation](https://vercel.com/docs)を参照
2. [Next.js Documentation](https://nextjs.org/docs)を参照
3. プロジェクトのGitHub Issuesで質問

---

## デプロイ完了チェックリスト

- [ ] Vercelアカウントの作成
- [ ] GitHubリポジトリの作成とコードのプッシュ
- [ ] Gemini API キーの取得
- [ ] Vercelプロジェクトの作成
- [ ] 環境変数の設定（`GEMINI_API_KEY`）
- [ ] デプロイの実行
- [ ] 動作確認
- [ ] カスタムドメインの設定（オプション）

お疲れ様でした！🎉

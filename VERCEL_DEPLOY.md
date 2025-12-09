# 🚀 Vercel デプロイガイド - ai-lp01

## 📋 デプロイ情報

| 項目 | 値 |
|------|-----|
| GitHubリポジトリ | https://github.com/hagiwara-dokidoki/ai-lp01 |
| Vercelプロジェクト | ai-lp01 |
| 本番URL | https://ai-lp01.vercel.app |

## 🎯 デプロイ手順

### 方法1: Vercel Dashboard（推奨）

#### ステップ1: Vercel Dashboardにアクセス
```
https://vercel.com/dashboard
```

#### ステップ2: 新規プロジェクト作成
1. **Add New** → **Project** をクリック
2. GitHubリポジトリ `hagiwara-dokidoki/ai-lp01` を選択
3. **Import** をクリック

#### ステップ3: プロジェクト設定
- **Project Name**: `ai-lp01`
- **Framework Preset**: Next.js（自動検出）
- **Root Directory**: `.`（デフォルト）

#### ステップ4: 環境変数を設定
**重要**: この設定がないとアプリは動作しません！

1. **Environment Variables** セクションで追加：

```
名前: GEMINI_API_KEY
値: [Your Gemini API Key]
環境: Production, Preview, Development (全て選択)
```

2. **Deploy** をクリック

---

### 方法2: Vercel CLI

```bash
# Vercelにログイン
npx vercel login

# プロジェクトをリンク
npx vercel link

# 環境変数を設定
npx vercel env add GEMINI_API_KEY production
npx vercel env add GEMINI_API_KEY preview
npx vercel env add GEMINI_API_KEY development

# 本番デプロイ
npx vercel --prod
```

---

## 🔍 デプロイ確認

デプロイ完了後、以下を確認：

### 本番URL
```
https://ai-lp01.vercel.app
```

### 確認項目
- ✅ URL入力とスクレイピングが動作する
- ✅ 画像が正しく抽出される
- ✅ AIコンテンツが生成される
- ✅ カラーパレットが表示される

---

## 🔧 トラブルシューティング

### エラー: "GEMINI_API_KEY is not configured"
**解決方法**:
1. Vercel Dashboard → Settings → Environment Variables
2. `GEMINI_API_KEY` を追加
3. Redeploy

### エラー: ビルド失敗
**解決方法**:
1. ローカルで `npm run build` を実行してテスト
2. エラーを修正してプッシュ

---

## 📊 設定情報

| 設定 | 値 |
|------|-----|
| フレームワーク | Next.js 16 |
| Node.js | 20.x (推奨) |
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `.next` |
| 環境変数 | `GEMINI_API_KEY` |

---

## 🔄 継続的デプロイ（CI/CD）

GitHubリポジトリと接続後：
- **main** へのプッシュ → 本番環境に自動デプロイ
- **他のブランチ** → プレビュー環境に自動デプロイ
- **Pull Request** → プレビューURLが自動生成

---

## 🎉 完了！

**本番URL**: https://ai-lp01.vercel.app

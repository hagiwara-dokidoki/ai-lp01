# 🚀 Vercel デプロイガイド - ai-cr01

## 📋 デプロイ状況

✅ GitHubリポジトリ: https://github.com/hagiwara-dokidoki/ai-cr01  
✅ Vercelプロジェクト: ai-cr01  
✅ 最新コード: プッシュ済み  

## 🎯 クイックデプロイ手順

### 方法1: Vercel Dashboard（推奨）

#### ステップ1: Vercel Dashboardにアクセス
```
https://vercel.com/dashboard
```

#### ステップ2: ai-cr01 プロジェクトを選択
既存の `ai-cr01` プロジェクトを選択します。

#### ステップ3: GitHubリポジトリと接続
もしまだ接続されていない場合：

1. プロジェクト設定（Settings）に移動
2. **Git** タブを選択
3. **Connect Git Repository** をクリック
4. `hagiwara-dokidoki/ai-cr01` を選択
5. **Connect** をクリック

#### ステップ4: 環境変数を設定
**重要**: この設定がないとアプリは動作しません！

1. プロジェクト設定（Settings）→ **Environment Variables** に移動
2. 新しい環境変数を追加：

```
名前: GEMINI_API_KEY
値: AIzaSyCS-PYOWyZjNVd_VijhSJCSWs6gTkQjpM4
環境: Production, Preview, Development (全て選択)
```

3. **Save** をクリック

#### ステップ5: デプロイ
環境変数を保存すると、自動的にデプロイが開始されます！

または、**Deployments** タブから **Redeploy** をクリック。

---

### 方法2: Vercel CLI（手動）

ターミナルから手動でデプロイする場合：

#### 1. Vercelにログイン
```bash
cd /home/user/webapp
npx vercel login
```
ブラウザが開き、ログインを求められます。

#### 2. プロジェクトをリンク
```bash
npx vercel link
```

プロンプトに従って入力：
- **Set up and deploy?** → `Yes`
- **Which scope?** → あなたのVercelアカウントを選択
- **Link to existing project?** → `Yes`
- **What's the name of your existing project?** → `ai-cr01`

#### 3. 環境変数を設定
```bash
npx vercel env add GEMINI_API_KEY production
```

プロンプトで値を入力：
```
AIzaSyCS-PYOWyZjNVd_VijhSJCSWs6gTkQjpM4
```

Preview環境とDevelopment環境にも追加：
```bash
npx vercel env add GEMINI_API_KEY preview
npx vercel env add GEMINI_API_KEY development
```

#### 4. デプロイ
```bash
npx vercel --prod
```

デプロイが完了すると、本番URLが表示されます！

---

## 🔍 デプロイ確認

デプロイが完了したら、以下を確認：

### 1. URLにアクセス
Vercel Dashboardで本番URLを確認し、アクセスします。

例: `https://ai-cr01.vercel.app` または `https://ai-cr01-xxx.vercel.app`

### 2. 動作テスト
以下のテストURLで各機能を確認：

#### テストURL例
- https://www.starbucks.co.jp/
- https://www.muji.com/
- https://www.uniqlo.com/jp/
- https://www.airbnb.jp/

#### 確認項目
- ✅ URL入力とスクレイピングが動作する
- ✅ 画像が正しく抽出される（最大20枚）
- ✅ 画像を4枚まで選択できる
- ✅ AIコピーが生成される（H1〜H4各10案）
- ✅ カラーパレットが表示される（8色）
- ✅ 色を5つの用途に割り当てられる
- ✅ プロンプト3案（A/B/C）が生成される
- ✅ バナープレビューが表示される

### 3. エラーチェック
もしエラーが発生した場合：

1. **Vercel Dashboard** → **Deployments** → 最新のデプロイを選択
2. **Logs** タブでエラーログを確認
3. 環境変数 `GEMINI_API_KEY` が正しく設定されているか確認

---

## 🔧 トラブルシューティング

### エラー: "GEMINI_API_KEY is not configured"
**原因**: 環境変数が設定されていません。

**解決方法**:
1. Vercel Dashboard → Settings → Environment Variables
2. `GEMINI_API_KEY` を追加
3. Redeploy

### エラー: ビルド失敗
**原因**: 依存関係の問題やコードエラー

**解決方法**:
1. ローカルで `npm run build` を実行してテスト
2. エラーを修正
3. GitHubにプッシュ
4. 自動で再デプロイ

### エラー: URLスクレイピングが動作しない
**原因**: 
- ターゲットURLのCORS制限
- robots.txt による制限

**解決方法**:
- 別のURLで試す
- CORS対応が必要なサイトは現在未対応

---

## 📊 デプロイ情報

### 現在の設定
- **プロジェクト名**: ai-cr01
- **フレームワーク**: Next.js 16
- **Node.js バージョン**: 自動（推奨: 20.x）
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `.next`
- **環境変数**: `GEMINI_API_KEY`

### パフォーマンス
- **ビルド時間**: ~12-15秒
- **初回読み込み**: ~1-2秒
- **APIレスポンス時間**: 5-15秒（Gemini API依存）

---

## 🔄 継続的デプロイ（CI/CD）

GitHubリポジトリと接続すると、以下が自動化されます：

- **mainブランチ**へのプッシュ → 本番環境に自動デプロイ
- **他のブランチ**へのプッシュ → プレビュー環境に自動デプロイ
- **Pull Request**作成 → プレビューURLが自動生成

すべてのデプロイは **Vercel Dashboard** の **Deployments** タブで確認できます。

---

## 📝 カスタムドメイン設定（オプション）

独自ドメインを使用する場合：

1. Vercel Dashboard → Settings → Domains
2. **Add Domain** をクリック
3. ドメイン名を入力（例: `banner-generator.example.com`）
4. DNS設定を指示に従って更新
5. 数分〜数時間で有効化

---

## 🎉 完了！

デプロイが成功すれば、AI Banner Generatorが世界中からアクセス可能になります！

**本番URL例**:
- https://ai-cr01.vercel.app
- https://ai-cr01-hagiwara-dokidoki.vercel.app

お疲れ様でした！🎨✨

---

## 📞 サポート

問題が発生した場合：
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- プロジェクトの README.md を参照

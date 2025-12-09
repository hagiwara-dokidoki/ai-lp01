# 🚀 AI LP Generator (ai-lp01)

サイト情報をもとにランディングページ（LP）を自動生成するNext.jsアプリケーション。Gemini APIを使用してコンテンツとデザインを生成します。

> **Note**: このプロジェクトは [ai-cr01](https://github.com/hagiwara-dokidoki/ai-cr01) をベースに作成されました。

## ✨ 目的

既存のWebサイトの情報を解析し、効果的なランディングページを自動生成することで、マーケティングやプロモーション活動を効率化します。

## 🎯 主な機能（予定）

1. **URLスクレイピング**: Webサイトから画像、テキスト、ブランドカラーを自動抽出
2. **コンテンツ分析**: サイトの特徴や強みをAIで分析
3. **LP構成提案**: ターゲット層に合わせたLP構成を自動提案
4. **コピー生成**: キャッチコピー、説明文、CTAテキストを自動生成
5. **デザイン生成**: ブランドに合ったLPデザインを複数案生成
6. **レスポンシブ対応**: モバイル/デスクトップ両対応のLP生成

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、Gemini API キーを設定:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 🔧 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **AI**: Google Gemini API
- **スクレイピング**: Cheerio, Axios
- **画像処理**: Sharp
- **ブラウザ自動化**: Puppeteer, Playwright

## 📦 プロジェクト構造

```
ai-lp01/
├── app/
│   ├── api/
│   │   ├── scrape/route.ts           # URLスクレイピングAPI
│   │   ├── generate-copies/route.ts  # コピー生成API
│   │   └── generate-prompts/route.ts # プロンプト生成API
│   ├── components/
│   │   └── ...                       # UIコンポーネント
│   └── page.tsx                       # メインページ
├── lib/
│   ├── services/
│   │   ├── scraper.ts                # スクレイピングサービス
│   │   ├── color-extractor.ts        # 色抽出サービス
│   │   └── gemini.ts                 # Gemini APIサービス
│   └── types/
│       └── index.ts                  # TypeScript型定義
└── package.json
```

## 📝 開発ロードマップ

### Phase 1: 基盤整備
- [x] ai-cr01からのプロジェクト移行
- [ ] LP生成用のデータ構造設計
- [ ] 基本UIの調整

### Phase 2: コア機能開発
- [ ] LP構成分析機能
- [ ] セクション別コンテンツ生成
- [ ] デザインテンプレート機能

### Phase 3: 拡張機能
- [ ] A/Bテスト用バリエーション生成
- [ ] HTMLエクスポート機能
- [ ] プレビュー機能強化

## 🚀 Vercelへのデプロイ

```bash
npm install -g vercel
vercel
```

環境変数の設定:
- `GEMINI_API_KEY`: Google Gemini API キー

## 📄 ライセンス

MIT License

## 🔗 関連リポジトリ

- [ai-cr01](https://github.com/hagiwara-dokidoki/ai-cr01) - AIバナー生成ツール（ベースプロジェクト）

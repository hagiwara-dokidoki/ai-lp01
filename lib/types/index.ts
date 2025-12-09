// Banner generation types

export interface ScrapedImage {
  url: string;
  score: number;
  width: number;
  height: number;
  alt: string;
  source: 'auto' | 'manual';
  id: string;
  isLogo?: boolean; // Flag to identify logo images
}

export interface StructuredContext {
  summary: string;
  benefits: string[];
  target: string;
  headlines_raw: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  keywords_top: string[];
  entities: string[];
}

export interface CopyCandidates {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
}

export interface SelectedCopies {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
}

export interface ColorPalette {
  hex: string;
  source: 'css' | 'img' | 'fill' | 'logo' | 'ai';
  role_hint: string;
}

export interface SelectedColors {
  base: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
}

export type PromptVariantKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface PromptVariant {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
  F: string;
  G: string;
  H: string;
  I: string;
  J: string;
  K: string;
  L: string;
}

export interface GeneratedBanner {
  url: string;
  size: string;
  variant: PromptVariantKey;
}

export interface BannerGenerationData {
  url: string;
  context: StructuredContext;
  images: {
    auto: ScrapedImage[];
    manual: ScrapedImage[];
    selected: string[];
  };
  copies: {
    llm_model: string;
    candidates: CopyCandidates;
    selected: SelectedCopies;
  };
  palette: {
    suggested_8: ColorPalette[];
    selected_5: SelectedColors;
  };
  prompts: PromptVariant;
  generated_images: Partial<Record<PromptVariantKey, GeneratedBanner>>;
}

export interface ScrapeResult {
  context: StructuredContext;
  images: ScrapedImage[];
  colors: ColorPalette[];
}

// LP Page Generation Types

/** 各ページのシナリオ定義 */
export interface LPPageScenario {
  pageNumber: number;         // ページ番号 (1-15)
  title: string;              // ページタイトル（例：「ファーストビュー」「問題提起」）
  scenario: string;           // そのページで伝えたい内容・シナリオ
  layoutType?: string;        // レイアウトタイプ（オプション）
  emphasis?: string;          // 強調したいポイント
}

/** LPシナリオ全体 */
export interface LPScenario {
  pages: LPPageScenario[];
  targetAudience?: string;    // ターゲット層
  lpGoal?: string;            // LPの目標（CV、認知など）
  tone?: string;              // トーン（親しみやすい、プロフェッショナルなど）
}

/** 生成されたページプロンプト */
export interface LPPagePrompt {
  pageNumber: number;
  title: string;
  prompt: string;             // 画像生成用プロンプト
  layoutDescription: string;  // レイアウト説明
  copyText?: {                // そのページ用のコピー
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
  };
}

/** LP生成結果 */
export interface LPGenerationResult {
  pages: LPPagePrompt[];
  metadata: {
    generatedAt: string;
    totalPages: number;
    sourceUrl?: string;
  };
}

/** 生成されたLP画像 */
export interface LPPageImage {
  pageNumber: number;
  imageData: string;          // Base64画像データ
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

/** LP全体の状態 */
export interface LPState {
  scenario: LPScenario;
  prompts: LPPagePrompt[];
  images: LPPageImage[];
}

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

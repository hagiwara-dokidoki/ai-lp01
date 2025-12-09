import { GoogleGenerativeAI } from '@google/generative-ai';
import { StructuredContext, CopyCandidates, PromptVariant, SelectedCopies, ColorPalette, SelectedColors } from '../types';

export interface SiteAnalysisInput {
  url: string;
  title: string;
  description: string;
  mainContent: string;
  headlines: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  extractedColors: string[]; // HEX colors found in CSS
}

export interface RecommendedColors {
  base: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
}

export interface SiteAnalysisResult {
  context: StructuredContext;
  copyCandidates: CopyCandidates;
  colorPalette: ColorPalette[];
  recommendedColors: RecommendedColors;
}

// Timing result for each analysis step
export interface AnalysisTiming {
  siteAnalysis: number;    // ms for summary, benefits, target, keywords, entities, brand_tone
  copyGeneration: number;  // ms for H1/H2/H3/H4 x 10 candidates
  colorProposal: number;   // ms for 17 colors + 5 recommended
  total: number;
}

export interface SiteAnalysisResultWithTiming extends SiteAnalysisResult {
  timing: AnalysisTiming;
}

// Timing for prompt generation (3 batches in parallel)
export interface PromptGenerationTiming {
  batch1_ABCD: number;
  batch2_EFGH: number;
  batch3_IJKL: number;
  total: number;
}

export interface PromptVariantWithTiming extends PromptVariant {
  timing: PromptGenerationTiming;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private readonly TEXT_MODEL = 'gemini-2.0-flash'; // Changed to faster model
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Analyze site data in 3 separate steps with timing
   */
  async analyzeSiteData(input: SiteAnalysisInput): Promise<SiteAnalysisResultWithTiming> {
    const timing: AnalysisTiming = {
      siteAnalysis: 0,
      copyGeneration: 0,
      colorProposal: 0,
      total: 0,
    };
    const totalStart = Date.now();

    console.log('🔍 Starting 3-step analysis with Gemini:', {
      url: input.url,
      model: this.TEXT_MODEL,
    });

    // Step 1: Site Analysis (summary, benefits, target, keywords, entities, brand_tone)
    const step1Start = Date.now();
    console.log('📊 [Step 1/3] Site Analysis starting...');
    const siteContext = await this.analyzeSiteContext(input);
    timing.siteAnalysis = Date.now() - step1Start;
    console.log(`✅ [Step 1/3] Site Analysis completed in ${timing.siteAnalysis}ms`);

    // Step 2: Copy Generation (H1/H2/H3/H4 x 10 candidates = 40 copies)
    const step2Start = Date.now();
    console.log('✍️ [Step 2/3] Copy Generation starting...');
    const copyCandidates = await this.generateCopiesForAnalysis(input, siteContext);
    timing.copyGeneration = Date.now() - step2Start;
    console.log(`✅ [Step 2/3] Copy Generation completed in ${timing.copyGeneration}ms`);

    // Step 3: Color Proposal (17 colors + 5 recommended)
    const step3Start = Date.now();
    console.log('🎨 [Step 3/3] Color Proposal starting...');
    const colorResult = await this.proposeColors(input, siteContext);
    timing.colorProposal = Date.now() - step3Start;
    console.log(`✅ [Step 3/3] Color Proposal completed in ${timing.colorProposal}ms`);

    timing.total = Date.now() - totalStart;

    console.log('🏁 Analysis complete:', {
      siteAnalysis: `${timing.siteAnalysis}ms`,
      copyGeneration: `${timing.copyGeneration}ms`,
      colorProposal: `${timing.colorProposal}ms`,
      total: `${timing.total}ms`,
    });

    return {
      context: siteContext,
      copyCandidates,
      colorPalette: colorResult.palette,
      recommendedColors: colorResult.recommended,
      timing,
    };
  }

  /**
   * Step 1: Analyze site context only
   */
  private async analyzeSiteContext(input: SiteAnalysisInput): Promise<StructuredContext> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 1000,
      },
    });

    const headlinesList = [
      ...input.headlines.h1.slice(0, 3).map(h => `H1: ${h}`),
      ...input.headlines.h2.slice(0, 3).map(h => `H2: ${h}`),
    ].join('\n');

    const prompt = `Analyze this website and output JSON only.

[URL] ${input.url}
[Title] ${input.title}
[Description] ${input.description}
[Headlines]
${headlinesList}
[Content excerpt]
${input.mainContent.slice(0, 1500)}

Output this exact JSON format:
{
  "summary": "2 sentence summary in Japanese",
  "benefits": ["benefit1", "benefit2", "benefit3"],
  "target": "target audience in Japanese",
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "entities": ["brand/product names found"],
  "brand_tone": "professional/casual/luxury/friendly"
}

Output ONLY valid JSON, no other text.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || input.description || input.title,
          benefits: parsed.benefits || [],
          target: parsed.target || 'general audience',
          headlines_raw: input.headlines,
          keywords_top: parsed.keywords || [],
          entities: parsed.entities || [],
        };
      }
    } catch (error) {
      console.error('❌ Site context analysis error:', error);
    }

    // Fallback
    return {
      summary: input.description || input.title || 'No description',
      benefits: [],
      target: 'general audience',
      headlines_raw: input.headlines,
      keywords_top: [],
      entities: [],
    };
  }

  /**
   * Step 2: Generate copy candidates
   */
  private async generateCopiesForAnalysis(input: SiteAnalysisInput, context: StructuredContext): Promise<CopyCandidates> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 1500,
      },
    });

    const prompt = `You are a Japanese ad copywriter. Generate banner copy based on:

[Summary] ${context.summary}
[Benefits] ${context.benefits.join(', ')}
[Target] ${context.target}
[Keywords] ${context.keywords_top.join(', ')}

Generate 10 candidates for each level in Japanese:
- H1: 18-28 characters (main headline, impactful)
- H2: 14-24 characters (subheadline)
- H3: 10-18 characters (feature highlight)
- H4: 6-14 characters (CTA button text)

Output this exact JSON format:
{
  "H1": ["copy1", "copy2", "copy3", "copy4", "copy5", "copy6", "copy7", "copy8", "copy9", "copy10"],
  "H2": ["copy1", "copy2", "copy3", "copy4", "copy5", "copy6", "copy7", "copy8", "copy9", "copy10"],
  "H3": ["copy1", "copy2", "copy3", "copy4", "copy5", "copy6", "copy7", "copy8", "copy9", "copy10"],
  "H4": ["copy1", "copy2", "copy3", "copy4", "copy5", "copy6", "copy7", "copy8", "copy9", "copy10"]
}

Output ONLY valid JSON, no other text.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          h1: parsed.H1 || this.getFallbackCopies(context).h1,
          h2: parsed.H2 || this.getFallbackCopies(context).h2,
          h3: parsed.H3 || this.getFallbackCopies(context).h3,
          h4: parsed.H4 || this.getFallbackCopies(context).h4,
        };
      }
    } catch (error) {
      console.error('❌ Copy generation error:', error);
    }

    return this.getFallbackCopies(context);
  }

  /**
   * Step 3: Propose colors
   */
  private async proposeColors(input: SiteAnalysisInput, context: StructuredContext): Promise<{
    palette: ColorPalette[];
    recommended: RecommendedColors;
  }> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 1200,
      },
    });

    const cssColorsList = input.extractedColors.slice(0, 6).join(', ') || 'none';

    const prompt = `You are a color designer. Propose banner colors based on:

[Brand] ${context.summary}
[Tone] ${context.target}
[CSS Colors found] ${cssColorsList}

Propose 17 complementary colors and 5 specific banner element colors.

Output this exact JSON:
{
  "colors": [
    {"hex": "#XXXXXX", "role": "background"},
    {"hex": "#XXXXXX", "role": "primary_text"},
    {"hex": "#XXXXXX", "role": "secondary_text"},
    {"hex": "#XXXXXX", "role": "accent"},
    {"hex": "#XXXXXX", "role": "cta"},
    {"hex": "#XXXXXX", "role": "highlight"},
    {"hex": "#XXXXXX", "role": "neutral"},
    {"hex": "#XXXXXX", "role": "contrast"},
    {"hex": "#XXXXXX", "role": "primary_light"},
    {"hex": "#XXXXXX", "role": "primary_dark"},
    {"hex": "#XXXXXX", "role": "secondary_light"},
    {"hex": "#XXXXXX", "role": "secondary_dark"},
    {"hex": "#XXXXXX", "role": "tertiary"},
    {"hex": "#XXXXXX", "role": "success"},
    {"hex": "#XXXXXX", "role": "warning"},
    {"hex": "#XXXXXX", "role": "info"},
    {"hex": "#XXXXXX", "role": "subtle"}
  ],
  "recommended": {
    "base": "#XXXXXX",
    "h1": "#XXXXXX",
    "h2": "#XXXXXX",
    "h3": "#XXXXXX",
    "h4": "#XXXXXX"
  }
}

Output ONLY valid JSON, no other text.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const palette = this.buildColorPalette(parsed.colors || [], input.extractedColors);
        const recommended: RecommendedColors = {
          base: this.extractHex(parsed.recommended?.base) || palette[0]?.hex || '#FFFFFF',
          h1: this.extractHex(parsed.recommended?.h1) || palette[1]?.hex || '#1A1A1A',
          h2: this.extractHex(parsed.recommended?.h2) || palette[2]?.hex || '#333333',
          h3: this.extractHex(parsed.recommended?.h3) || palette[3]?.hex || '#666666',
          h4: this.extractHex(parsed.recommended?.h4) || palette[4]?.hex || '#3B82F6',
        };
        return { palette, recommended };
      }
    } catch (error) {
      console.error('❌ Color proposal error:', error);
    }

    // Fallback
    return {
      palette: this.buildColorPalette([], input.extractedColors),
      recommended: {
        base: '#FFFFFF',
        h1: '#1A1A1A',
        h2: '#333333',
        h3: '#666666',
        h4: '#3B82F6',
      },
    };
  }

  /**
   * Build color palette from AI colors and CSS colors
   */
  private buildColorPalette(aiColors: any[], cssColors: string[]): ColorPalette[] {
    const palette: ColorPalette[] = [];
    const TARGET_TOTAL = 20;
    const MIN_CSS_COLORS = 3;
    
    // Add CSS colors first
    cssColors.forEach((hex, index) => {
      if (palette.length < TARGET_TOTAL) {
        const normalizedHex = hex.toUpperCase();
        if (!palette.some(p => p.hex === normalizedHex)) {
          palette.push({
            hex: normalizedHex,
            source: 'css' as const,
            role_hint: index === 0 ? 'primary' : 'extracted',
          });
        }
      }
    });
    
    // Ensure minimum CSS colors
    if (palette.length > 0 && palette.length < MIN_CSS_COLORS) {
      const baseColor = palette[0].hex;
      while (palette.filter(c => c.source === 'css').length < MIN_CSS_COLORS) {
        const variation = this.adjustBrightness(baseColor, palette.length * 25);
        if (!palette.some(p => p.hex === variation)) {
          palette.push({
            hex: variation,
            source: 'css' as const,
            role_hint: 'css_variation',
          });
        } else break;
      }
    }
    
    // Add AI colors
    aiColors.forEach((c: any) => {
      if (palette.length < TARGET_TOTAL) {
        const hex = c.hex?.toUpperCase();
        if (hex && !palette.some(p => p.hex === hex)) {
          palette.push({
            hex,
            source: 'ai' as const,
            role_hint: c.role || 'ai_suggested',
          });
        }
      }
    });

    // Fill with defaults
    const defaults = this.getDefaultColors();
    let i = 0;
    while (palette.length < TARGET_TOTAL && i < defaults.length) {
      if (!palette.some(p => p.hex === defaults[i])) {
        palette.push({
          hex: defaults[i],
          source: 'ai' as const,
          role_hint: 'default',
        });
      }
      i++;
    }

    return palette.slice(0, TARGET_TOTAL);
  }

  // Legacy method for backward compatibility (single API call version)
  async analyzeSiteDataLegacy(input: SiteAnalysisInput): Promise<SiteAnalysisResult> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4000,
      },
    });

    const prompt = this.buildSiteAnalysisPrompt(input);

    console.log('🔍 Analyzing site with Gemini (legacy):', {
      url: input.url,
      titleLength: input.title?.length,
      descriptionLength: input.description?.length,
      contentLength: input.mainContent?.length,
      extractedColorsCount: input.extractedColors?.length,
    });

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      console.log('📝 Gemini analysis response length:', text.length);

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        console.log('✅ Parsed analysis result:', {
          hasSummary: !!parsed.summary,
          benefitsCount: parsed.benefits?.length,
          h1Count: parsed.copies?.H1?.length,
          colorsCount: parsed.colors?.length,
        });

        return this.buildAnalysisResult(parsed, input);
      }

      throw new Error('Failed to parse site analysis response');
    } catch (error: any) {
      console.error('❌ Site analysis error:', error);
      return this.getFallbackAnalysisResult(input);
    }
  }

  private buildSiteAnalysisPrompt(input: SiteAnalysisInput): string {
    const headlinesList = [
      ...input.headlines.h1.map(h => `H1: ${h}`),
      ...input.headlines.h2.slice(0, 5).map(h => `H2: ${h}`),
      ...input.headlines.h3.slice(0, 5).map(h => `H3: ${h}`),
    ].join('\n');

    const colorsList = input.extractedColors.length > 0 
      ? input.extractedColors.join(', ')
      : 'No colors extracted from CSS';

    return `You are an expert marketing analyst and ad copywriter.
Analyze this website data and generate:
1. A structured context summary
2. Banner copy candidates in Japanese
3. A recommended color palette

[Website URL]
${input.url}

[Page Title]
${input.title}

[Meta Description]
${input.description}

[Headlines Found]
${headlinesList || 'No headlines found'}

[Main Content (excerpt)]
${input.mainContent.slice(0, 3000)}

[Colors Found in CSS]
${colorsList}

Based on this data, analyze:
1. What is this business/product/service about?
2. What are the key benefits and value propositions?
3. Who is the target audience?
4. What is the brand tone and style?
5. What colors would best represent this brand?

Generate the following JSON response:

{
  "summary": "2-3 sentence summary of the business/product in Japanese",
  "benefits": ["benefit1 in Japanese", "benefit2", "benefit3", "benefit4", "benefit5"],
  "target": "Target audience description in Japanese",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "entities": ["brand name", "product name", "price if found"],
  "brand_tone": "professional/casual/luxury/friendly/etc",
  "copies": {
    "H1": ["18-28文字のメインコピー案1", "案2", "案3", "案4", "案5", "案6", "案7", "案8", "案9", "案10"],
    "H2": ["14-24文字のサブコピー案1", "案2", "案3", "案4", "案5", "案6", "案7", "案8", "案9", "案10"],
    "H3": ["10-18文字の特徴コピー案1", "案2", "案3", "案4", "案5", "案6", "案7", "案8", "案9", "案10"],
    "H4": ["6-14文字のCTAコピー案1", "案2", "案3", "案4", "案5", "案6", "案7", "案8", "案9", "案10"]
  },
  "colors": [
    {"hex": "#XXXXXX", "role": "background", "reason": "なぜこの色を選んだか"},
    {"hex": "#XXXXXX", "role": "primary_text", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "secondary_text", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "accent", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "cta", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "highlight", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "neutral", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "contrast", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "primary_light", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "primary_dark", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "secondary_light", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "secondary_dark", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "tertiary", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "success", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "warning", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "info", "reason": "理由"},
    {"hex": "#XXXXXX", "role": "subtle", "reason": "理由"}
  ],
  "recommended_colors": {
    "base": "#XXXXXX (バナー背景として最適な色)",
    "h1": "#XXXXXX (メイン見出しに最適な色、背景とのコントラスト重視)",
    "h2": "#XXXXXX (サブ見出しに最適な色)",
    "h3": "#XXXXXX (特徴テキストに最適な色)",
    "h4": "#XXXXXX (CTAボタンに最適な色、目立つ色)"
  }
}

IMPORTANT RULES:
- All copy text must be in Japanese
- Copy must be creative and conversion-focused, not just copied from the site
- H1: 18-28 characters (main headline - impactful, attention-grabbing)
- H2: 14-24 characters (subheadline - supporting message)
- H3: 10-18 characters (feature highlight)
- H4: 6-14 characters (call-to-action)
- For "colors": Provide 17 AI-recommended colors that complement the site's brand (we will combine with CSS colors for 20 total)
- The "recommended_colors" section is CRITICAL: suggest the BEST colors for each banner element
  - base: Choose a background color that works well for banners (often light/neutral)
  - h1: High contrast, bold, attention-grabbing color for main headline
  - h2: Slightly softer than h1, but still readable
  - h3: Supporting text color, good readability
  - h4: CTA color - should be vibrant and action-oriented (often brand accent)
- Consider color psychology and banner design best practices

Output ONLY the JSON, no other text.`;
  }

  private buildAnalysisResult(parsed: any, input: SiteAnalysisInput): SiteAnalysisResult {
    // Build StructuredContext
    const context: StructuredContext = {
      summary: parsed.summary || input.description || input.title,
      benefits: parsed.benefits || [],
      target: parsed.target || 'general audience',
      headlines_raw: input.headlines,
      keywords_top: parsed.keywords || [],
      entities: parsed.entities || [],
    };

    // Build CopyCandidates
    const copyCandidates: CopyCandidates = {
      h1: parsed.copies?.H1 || this.getFallbackCopies(context).h1,
      h2: parsed.copies?.H2 || this.getFallbackCopies(context).h2,
      h3: parsed.copies?.H3 || this.getFallbackCopies(context).h3,
      h4: parsed.copies?.H4 || this.getFallbackCopies(context).h4,
    };

    // Build ColorPalette: CSS colors first (minimum 3), then AI colors, total 20
    const colorPalette: ColorPalette[] = [];
    const TARGET_TOTAL = 20;
    const MIN_CSS_COLORS = 3;
    
    // Add CSS-extracted colors first
    const cssColors = input.extractedColors || [];
    cssColors.forEach((hex, index) => {
      if (colorPalette.length < TARGET_TOTAL) {
        const normalizedHex = hex.toUpperCase();
        if (!colorPalette.some(p => p.hex === normalizedHex)) {
          colorPalette.push({
            hex: normalizedHex,
            source: 'css' as const,
            role_hint: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'extracted',
          });
        }
      }
    });
    
    const cssCount = colorPalette.length;
    
    // If we have fewer than MIN_CSS_COLORS, generate variations from existing CSS colors
    if (cssCount > 0 && cssCount < MIN_CSS_COLORS) {
      const baseColor = colorPalette[0].hex;
      while (colorPalette.filter(c => c.source === 'css').length < MIN_CSS_COLORS) {
        const variation = this.adjustBrightness(baseColor, (colorPalette.length - cssCount + 1) * 25);
        if (!colorPalette.some(p => p.hex === variation)) {
          colorPalette.push({
            hex: variation,
            source: 'css' as const,
            role_hint: 'css_variation',
          });
        } else {
          break; // Avoid infinite loop
        }
      }
    }
    
    // Add AI-recommended colors (no upper limit, fill remaining slots)
    const aiColors = parsed.colors || [];
    aiColors.forEach((c: any) => {
      if (colorPalette.length < TARGET_TOTAL) {
        const hex = c.hex?.toUpperCase() || this.getDefaultColors()[colorPalette.length % this.getDefaultColors().length];
        // Avoid duplicates
        if (!colorPalette.some(p => p.hex === hex)) {
          colorPalette.push({
            hex,
            source: 'ai' as const,
            role_hint: c.role || 'ai_suggested',
          });
        }
      }
    });

    // Fill remaining with defaults if needed to reach TARGET_TOTAL
    while (colorPalette.length < TARGET_TOTAL) {
      const defaultColor = this.getDefaultColors()[colorPalette.length % this.getDefaultColors().length];
      if (!colorPalette.some(p => p.hex === defaultColor)) {
        colorPalette.push({
          hex: defaultColor,
          source: 'ai' as const, // Mark as AI since they're design-recommended defaults
          role_hint: 'complement',
        });
      } else {
        // Generate a variation if duplicate
        colorPalette.push({
          hex: this.adjustBrightness(defaultColor, colorPalette.length * 8),
          source: 'ai' as const,
          role_hint: 'variation',
        });
      }
    }

    // Parse recommended colors from AI
    const recColors = parsed.recommended_colors || {};
    const recommendedColors: RecommendedColors = {
      base: this.extractHex(recColors.base) || colorPalette[0]?.hex || '#FFFFFF',
      h1: this.extractHex(recColors.h1) || colorPalette[1]?.hex || '#1A1A1A',
      h2: this.extractHex(recColors.h2) || colorPalette[2]?.hex || '#333333',
      h3: this.extractHex(recColors.h3) || colorPalette[3]?.hex || '#666666',
      h4: this.extractHex(recColors.h4) || colorPalette[4]?.hex || '#3B82F6',
    };

    console.log('🎨 Color palette built:', {
      total: colorPalette.length,
      cssColors: colorPalette.filter(c => c.source === 'css').length,
      aiColors: colorPalette.filter(c => c.source === 'ai').length,
      recommendedColors,
    });

    return {
      context,
      copyCandidates,
      colorPalette: colorPalette.slice(0, TARGET_TOTAL),
      recommendedColors,
    };
  }

  // Helper to extract hex from string like "#FFFFFF (description)"
  private extractHex(str: string | undefined): string | null {
    if (!str) return null;
    const match = str.match(/#[0-9A-Fa-f]{6}/);
    return match ? match[0].toUpperCase() : null;
  }

  // Helper to adjust brightness of a hex color
  private adjustBrightness(hex: string, amount: number): string {
    const rgb = this.hexToRgbInternal(hex);
    if (!rgb) return hex;
    
    const r = Math.min(255, Math.max(0, rgb.r + amount));
    const g = Math.min(255, Math.max(0, rgb.g + amount));
    const b = Math.min(255, Math.max(0, rgb.b + amount));
    
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  private hexToRgbInternal(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private getFallbackAnalysisResult(input: SiteAnalysisInput): SiteAnalysisResult {
    const context: StructuredContext = {
      summary: input.description || input.title || 'No description available',
      benefits: [],
      target: 'general audience',
      headlines_raw: input.headlines,
      keywords_top: [],
      entities: [],
    };

    // Build palette with CSS colors first (min 3), then AI/defaults, total 20
    const colorPalette: ColorPalette[] = [];
    const TARGET_TOTAL = 20;
    const MIN_CSS_COLORS = 3;
    
    const cssColors = input.extractedColors || [];
    cssColors.forEach((hex, i) => {
      const normalizedHex = hex.toUpperCase();
      if (!colorPalette.some(c => c.hex === normalizedHex)) {
        colorPalette.push({
          hex: normalizedHex,
          source: 'css' as const,
          role_hint: i === 0 ? 'primary' : 'extracted',
        });
      }
    });
    
    // Ensure minimum CSS colors
    if (colorPalette.length > 0 && colorPalette.length < MIN_CSS_COLORS) {
      const baseColor = colorPalette[0].hex;
      while (colorPalette.filter(c => c.source === 'css').length < MIN_CSS_COLORS) {
        const variation = this.adjustBrightness(baseColor, colorPalette.length * 25);
        if (!colorPalette.some(p => p.hex === variation)) {
          colorPalette.push({
            hex: variation,
            source: 'css' as const,
            role_hint: 'css_variation',
          });
        } else {
          break;
        }
      }
    }
    
    this.getDefaultColors().forEach((hex) => {
      if (colorPalette.length < TARGET_TOTAL && !colorPalette.some(c => c.hex === hex)) {
        colorPalette.push({
          hex,
          source: 'ai' as const,
          role_hint: 'default',
        });
      }
    });

    return {
      context,
      copyCandidates: this.getFallbackCopies(context),
      colorPalette: colorPalette.slice(0, TARGET_TOTAL),
      recommendedColors: {
        base: '#FFFFFF',
        h1: '#1A1A1A',
        h2: '#333333',
        h3: '#666666',
        h4: '#3B82F6',
      },
    };
  }

  private getDefaultColors(): string[] {
    return [
      '#FFFFFF', // background
      '#1A1A1A', // primary text
      '#4A4A4A', // secondary text  
      '#3B82F6', // accent
      '#2563EB', // cta
      '#DBEAFE', // highlight
      '#6B7280', // neutral
      '#F3F4F6', // contrast
      '#10B981', // success
      '#F59E0B', // warning
      '#EF4444', // error
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
      '#06B6D4', // cyan
    ];
  }

  async generateCopyCandidates(context: StructuredContext): Promise<CopyCandidates> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1200,
      },
    });

    const prompt = this.buildCopyGenerationPrompt(context);

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          h1: parsed.H1 || [],
          h2: parsed.H2 || [],
          h3: parsed.H3 || [],
          h4: parsed.H4 || [],
        };
      }

      throw new Error('Failed to parse copy candidates');
    } catch (error: any) {
      console.error('Error generating copy candidates:', error);
      // Return fallback copies
      return this.getFallbackCopies(context);
    }
  }

  private buildCopyGenerationPrompt(context: StructuredContext): string {
    return `You are a Japanese ad copywriter.
Generate banner copy candidates based on the context.

[Context]
Summary: ${context.summary}
Benefits: ${context.benefits.join(', ')}
Target: ${context.target}
Keywords: ${context.keywords_top.slice(0, 10).join(', ')}
Entities: ${context.entities.join(', ')}

[Rules]
- Output 10 candidates for each level: H1, H2, H3, H4
- Do NOT copy existing headlines verbatim; rephrase creatively.
- Keep the brand tone consistent with the context.
- Avoid exaggeration beyond what context supports.
- Use simple, high-conversion Japanese for banners.

[Length]
H1: 18-28 chars
H2: 14-24 chars
H3: 10-18 chars
H4: 6-14 chars

[Output format JSON]
{
  "H1": ["案1", "案2", ... "案10"],
  "H2": ["案1", "案2", ... "案10"],
  "H3": ["案1", "案2", ... "案10"],
  "H4": ["案1", "案2", ... "案10"]
}

Generate creative, engaging copy that would drive conversions.`;
  }

  private getFallbackCopies(context: StructuredContext): CopyCandidates {
    return {
      h1: [
        '新しい体験をあなたに',
        'より良い明日のために',
        '選ばれる理由がここに',
        '期待を超える価値を',
        'あなたの夢を叶える',
        '信頼と実績の証',
        '最高の品質をお届け',
        '今すぐ始めよう',
        '未来を切り拓く',
        'あなたらしさを表現',
      ],
      h2: [
        'プロフェッショナルな品質',
        '簡単・安心・便利',
        'お客様満足度No.1',
        '業界最高水準',
        '豊富な実績と信頼',
        '手軽に始められる',
        'コストパフォーマンス抜群',
        '安心のサポート体制',
        '選ばれ続ける理由',
        '今だけの特別価格',
      ],
      h3: [
        '無料体験実施中',
        '今なら特典付き',
        '簡単3ステップ',
        '専門家が対応',
        '24時間サポート',
        '初めての方も安心',
        'すぐに使える',
        'お得なプラン',
        '限定キャンペーン',
        '資料請求無料',
      ],
      h4: [
        '詳しくはこちら',
        '今すぐ申込',
        '無料相談',
        'お問合せ',
        '資料請求',
        '体験予約',
        'もっと見る',
        '始める',
        'お試し',
        'Click!',
      ],
    };
  }

  // Timing for prompt generation
  async generatePrompts(
    context: StructuredContext,
    selectedCopies: SelectedCopies,
    selectedImages: any[],
    palette: ColorPalette[],
    selectedColors: SelectedColors
  ): Promise<PromptVariantWithTiming> {
    const timing = {
      batch1_ABCD: 0,
      batch2_EFGH: 0,
      batch3_IJKL: 0,
      total: 0,
    };
    const totalStart = Date.now();

    console.log('🎨 Starting 3-batch prompt generation:', {
      copies: selectedCopies,
      colors: selectedColors,
      imagesCount: selectedImages?.length || 0,
    });

    const basePromptData = this.buildBasePromptData(context, selectedCopies, selectedImages, palette, selectedColors);

    // Generate 3 batches in parallel for speed
    console.log('🚀 Starting parallel batch generation...');
    
    const batch1Start = Date.now();
    const batch2Start = Date.now();
    const batch3Start = Date.now();

    const [batch1Result, batch2Result, batch3Result] = await Promise.all([
      this.generatePromptBatch(['A', 'B', 'C', 'D'], basePromptData, selectedCopies, selectedColors)
        .then(result => {
          timing.batch1_ABCD = Date.now() - batch1Start;
          console.log(`✅ [Batch 1/3] A-D completed in ${timing.batch1_ABCD}ms`);
          return result;
        }),
      this.generatePromptBatch(['E', 'F', 'G', 'H'], basePromptData, selectedCopies, selectedColors)
        .then(result => {
          timing.batch2_EFGH = Date.now() - batch2Start;
          console.log(`✅ [Batch 2/3] E-H completed in ${timing.batch2_EFGH}ms`);
          return result;
        }),
      this.generatePromptBatch(['I', 'J', 'K', 'L'], basePromptData, selectedCopies, selectedColors)
        .then(result => {
          timing.batch3_IJKL = Date.now() - batch3Start;
          console.log(`✅ [Batch 3/3] I-L completed in ${timing.batch3_IJKL}ms`);
          return result;
        }),
    ]);

    timing.total = Date.now() - totalStart;

    console.log('🏁 Prompt generation complete:', {
      batch1_ABCD: `${timing.batch1_ABCD}ms`,
      batch2_EFGH: `${timing.batch2_EFGH}ms`,
      batch3_IJKL: `${timing.batch3_IJKL}ms`,
      total: `${timing.total}ms`,
    });

    // Merge all batches with defaults for any missing values
    const variants: PromptVariant = {
      A: batch1Result.A || this.getDefaultPrompt('A'),
      B: batch1Result.B || this.getDefaultPrompt('B'),
      C: batch1Result.C || this.getDefaultPrompt('C'),
      D: batch1Result.D || this.getDefaultPrompt('D'),
      E: batch2Result.E || this.getDefaultPrompt('E'),
      F: batch2Result.F || this.getDefaultPrompt('F'),
      G: batch2Result.G || this.getDefaultPrompt('G'),
      H: batch2Result.H || this.getDefaultPrompt('H'),
      I: batch3Result.I || this.getDefaultPrompt('I'),
      J: batch3Result.J || this.getDefaultPrompt('J'),
      K: batch3Result.K || this.getDefaultPrompt('K'),
      L: batch3Result.L || this.getDefaultPrompt('L'),
    };

    return { ...variants, timing };
  }

  /**
   * Generate a batch of 4 prompt variants
   */
  private async generatePromptBatch(
    variantKeys: string[],
    baseData: string,
    selectedCopies: SelectedCopies,
    selectedColors: SelectedColors
  ): Promise<Partial<PromptVariant>> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 6000,
      },
    });

    const prompt = this.buildBatchPrompt(variantKeys, baseData);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const variants: Partial<PromptVariant> = {};
      for (const key of variantKeys) {
        const extracted = this.extractSinglePrompt(text, key, variantKeys);
        variants[key as keyof PromptVariant] = extracted || this.getDefaultPrompt(key);
      }
      
      return variants;
    } catch (error) {
      console.error(`❌ Batch ${variantKeys.join('')} failed:`, error);
      const fallback: Partial<PromptVariant> = {};
      for (const key of variantKeys) {
        fallback[key as keyof PromptVariant] = this.getDefaultPrompt(key);
      }
      return fallback;
    }
  }

  /**
   * Build base prompt data (shared across all batches)
   * NOTE: Do NOT use labels like "H1:", "H2:" - AI will render them as text.
   * Instead, describe text by role (main headline, subheading, etc.)
   */
  private buildBasePromptData(
    context: StructuredContext,
    copies: SelectedCopies,
    images: any[],
    palette: ColorPalette[],
    colors: SelectedColors
  ): string {
    const logoImages = images?.filter(img => img.isLogo) || [];
    const regularImages = images?.filter(img => !img.isLogo) || [];
    
    const logosList = logoImages.length > 0
      ? logoImages.map((img, i) => `Logo ${i + 1}: "${img.alt || 'Logo'}" (${img.url})`).join('\n')
      : 'No logo';
    
    const imagesList = regularImages.length > 0
      ? regularImages.map((img, i) => `Image ${i + 1}: "${img.alt || 'No desc'}" (${img.url})`).join('\n')
      : 'No images';

    // Use descriptive roles instead of "H1:", "H2:" labels to prevent them from being rendered
    return `[Brand] ${context.summary}
[Banner Text to Display]
- Main headline: "${copies.h1}"
- Subheading: "${copies.h2}"
- Feature text: "${copies.h3}"
- Call-to-action button: "${copies.h4}"
[Logo] ${logosList}
[Images] ${imagesList}
[Colors] Background: ${colors.base}, Main text: ${colors.h1}, Sub text: ${colors.h2}, Feature: ${colors.h3}, CTA: ${colors.h4}`;
  }

  /**
   * Build prompt for a specific batch of variants
   * IMPORTANT: Avoid using "H1", "H2", "H3", "H4" labels - they get rendered as text in the image
   */
  private buildBatchPrompt(variantKeys: string[], baseData: string): string {
    const layoutDescriptions: Record<string, string> = {
      A: 'A (Classic Centered): CENTERED layout, product image 60% center, large main headline at TOP, subheading below it, feature text and CTA button at BOTTOM strip',
      B: 'B (Creative Diagonal): DIAGONAL 45° layout, all elements tilted, asymmetric, artistic composition',
      C: 'C (Minimal): MINIMAL layout, tiny image bottom-right 20%, main headline alone in center, 70% whitespace',
      D: 'D (Impact): FULL-BLEED hero image fills background, text overlay on semi-transparent dark band, huge main headline',
      E: 'E (Story): 3-COLUMN vertical split, left=context image, center=transition with subheading, right=result with CTA',
      F: 'F (Tech): GEOMETRIC shapes (triangles/hexagons), neon accent lines, gradient tech aesthetic',
      G: 'G (Organic): ORGANIC wavy borders, curved text flow, leaf decorations, watercolor style',
      H: 'H (Luxury): FRAMED with ornate gold border, small centered image, dark background, elegant typography',
      I: 'I (Pop): SCATTERED elements at random angles, sticker collage style, energetic and youthful',
      J: 'J (Japanese): VERTICAL text orientation, circular image frame, intentional empty space (ma)',
      K: 'K (Grid): RIGID 2x2 GRID layout, image spans 2 cells, text in separate bordered cells, editorial magazine style',
      L: 'L (Emotional): DREAMY blurred background, centered text with soft glow effect, vignette edges',
    };

    const variantInstructions = variantKeys.map(key => layoutDescriptions[key]).join('\n');

    return `Generate ${variantKeys.length} banner image prompts (1080x1080px square) for AI image generation.

${baseData}

Generate these specific layout styles:
${variantInstructions}

CRITICAL RULES:
1. Each prompt must specify 1080x1080px square format
2. Include the ACTUAL TEXT CONTENT provided above (main headline, subheading, feature text, CTA) - render them as readable text in the banner
3. DO NOT include labels like "H1:", "H2:", "Main headline:", etc. in the generated image - only the actual text content
4. Use the specified colors for background and text
5. Reference the provided images/logo in the design
6. Each layout must be VISUALLY DISTINCT from others

Output format:
[PROMPT ${variantKeys[0]}]
(detailed image generation prompt for variant ${variantKeys[0]})

[PROMPT ${variantKeys[1]}]
(detailed image generation prompt for variant ${variantKeys[1]})

[PROMPT ${variantKeys[2]}]
(detailed image generation prompt for variant ${variantKeys[2]})

[PROMPT ${variantKeys[3]}]
(detailed image generation prompt for variant ${variantKeys[3]})`;
  }

  /**
   * Extract a single prompt from batch response
   */
  private extractSinglePrompt(text: string, key: string, allKeys: string[]): string {
    const keyIndex = allKeys.indexOf(key);
    const nextKey = allKeys[keyIndex + 1];
    
    const regex = nextKey 
      ? new RegExp(`\\[PROMPT ${key}\\]([\\s\\S]*?)(?=\\[PROMPT ${nextKey}\\])`)
      : new RegExp(`\\[PROMPT ${key}\\]([\\s\\S]*?)$`);
    
    const match = text.match(regex);
    return match?.[1]?.trim() || '';
  }

  // Legacy single-call method (kept for compatibility)
  async generatePromptsLegacy(
    context: StructuredContext,
    selectedCopies: SelectedCopies,
    selectedImages: any[],
    palette: ColorPalette[],
    selectedColors: SelectedColors
  ): Promise<PromptVariant> {
    console.log('🎨 Generating prompts (legacy single call):', {
      copies: selectedCopies,
      colors: selectedColors,
      imagesCount: selectedImages?.length || 0,
    });

    const model = this.genAI.getGenerativeModel({ 
      model: this.TEXT_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 16000,
      },
    });

    const prompt = this.buildPromptGenerationPrompt(context, selectedCopies, selectedImages, palette, selectedColors);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      if (!text) {
        return this.getFallbackPrompts(selectedCopies, selectedColors);
      }

      const variants = this.parsePromptVariants(text);
      const mainVariantsValid = variants.A.length >= 100 && variants.B.length >= 100;
      
      if (!mainVariantsValid) {
        return this.getFallbackPrompts(selectedCopies, selectedColors);
      }

      return variants;
    } catch (error) {
      console.error('❌ Legacy prompt generation error:', error);
      return this.getFallbackPrompts(selectedCopies, selectedColors);
    }
  }

  private buildPromptGenerationPrompt(
    context: StructuredContext,
    copies: SelectedCopies,
    images: any[], // Changed to accept full image objects
    palette: ColorPalette[],
    colors: SelectedColors
  ): string {
    // Separate logo images from regular images
    const logoImages = images?.filter(img => img.isLogo) || [];
    const regularImages = images?.filter(img => !img.isLogo) || [];
    
    // Build logo image descriptions
    const logosList = logoImages.length > 0
      ? logoImages.map((img, i) => {
          const alt = img.alt || 'Logo';
          const url = img.url || '';
          return `🏷️ Logo ${i + 1}: "${alt}"
   🔗 Logo URL: ${url}
   ✅ MANDATORY: Place this logo prominently in the banner
   → Use as brand identity element, typically in corner or header area`;
        }).join('\n\n')
      : 'No logo images detected';
    
    // Build detailed image descriptions with URLs
    const imagesList = regularImages.length > 0
      ? regularImages.map((img, i) => {
          const alt = img.alt || 'No description';
          const width = img.width || 'unknown';
          const height = img.height || 'unknown';
          const url = img.url || '';
          return `📸 Image ${i + 1}: "${alt}" (${width}x${height}px)
   🔗 Image URL: ${url}
   ✅ MUST USE: Extract visual elements from this image for the banner
   → Reference this image's style, colors, composition, and subject matter`;
        }).join('\n\n')
      : 'No specific images provided';
    
    const paletteList = palette.map(c => c.hex).join(', ');

    return `Generate TWELVE prompt variants (A through L) for an AI image generator to create a 1080x1080px square advertising banner.

[Brand/Service Summary]
${context.summary}

[Text Content to Display in Banner]
The following text must appear in the generated banner image. Use ONLY the actual text content - do NOT include any labels like "H1:", "Main headline:", etc.
- Main headline (large, prominent): "${copies.h1}"
- Subheading (medium size): "${copies.h2}"
- Feature/benefit text (smaller): "${copies.h3}"
- Call-to-action button text: "${copies.h4}"

⚠️ IMPORTANT: When generating prompts, write the actual text content directly (e.g., "Display the text '${copies.h1}' as the main headline"), NOT labels like "H1" or "main headline:".

[🏷️ BRAND LOGO - MUST INCLUDE]
${logosList}

⚠️ LOGO PLACEMENT REQUIREMENTS:
- The brand logo MUST appear in the banner design
- Place logo in a prominent but non-intrusive position (typically top-left, top-right, or bottom corner)
- Maintain logo visibility and legibility
- Do not distort or crop the logo
- Ensure logo has sufficient contrast with background

[🎨 Reference Images - MUST USE THESE IMAGES]
The following images are provided as reference materials. The AI image generator **MUST incorporate visual elements from these images** into the banner design:

${imagesList}

⚠️ CRITICAL IMAGE USAGE REQUIREMENTS:
1. **MANDATORY IMAGE REFERENCE** - Your prompts MUST describe how to use visual elements from the above images
2. **Specific Image Details** - Reference the actual content shown in these images (products, scenes, colors, objects)
3. **Visual Consistency** - Match the aesthetic, color tone, lighting, and mood of these reference images
4. **Composition Guidance** - Use similar layouts, angles, framing, or arrangements as the references
5. **Product/Subject Depiction** - If images show specific items (drinks, food, products), explicitly describe them in the prompt
6. **Background & Setting** - Incorporate similar backgrounds, textures, patterns, or environments from the references
7. **Do NOT Create from Scratch** - The banner should feel like it uses these images as collage materials or visual inspiration

💡 Example: If reference image shows "Seasonal Holiday Drink - S'mores Chocolate Frappuccino", your prompt MUST explicitly request:
- A S'mores Chocolate Frappuccino drink with whipped cream and chocolate drizzle
- Holiday-themed elements (cups, decorations, backgrounds)
- The specific visual style and color scheme from the reference image

[Color Palette]
Available colors: ${paletteList}
Chosen colors:
- Background color: ${colors.base}
- Main headline text color: ${colors.h1}
- Subheading text color: ${colors.h2}
- Feature text color: ${colors.h3}
- CTA button color: ${colors.h4}

Generate TWELVE prompt variants (A through L). Each MUST have a COMPLETELY DIFFERENT layout and composition.

⚠️ CRITICAL TEXT RENDERING RULE:
When specifying text in prompts, write the ACTUAL TEXT CONTENT ONLY.
❌ WRONG: "H1 text at top" or "Display H1: 新しい体験"
✅ CORRECT: "Display '${copies.h1}' as large headline at top"

⚠️ CRITICAL: Each variant must look DISTINCTLY DIFFERENT from the others. Vary:
- Image placement (left/right/center/full-bleed/corner/split)
- Text position (top/bottom/overlay/side/diagonal)
- Visual balance (symmetric/asymmetric/rule-of-thirds)
- White space usage (minimal/generous/strategic)
- Element sizing (large hero vs small accents)

**Prompt A (Classic Centered):**
LAYOUT: Product/hero image CENTERED at 60% size. Large main headline "${copies.h1}" at TOP. Subheading "${copies.h2}" directly below. Feature text "${copies.h3}" and CTA "${copies.h4}" at BOTTOM strip.
COMPOSITION: Symmetrical, balanced, professional.

**Prompt B (Diagonal Dynamic):**
LAYOUT: Image placed at 45-degree DIAGONAL. Main headline "${copies.h1}" in TOP-LEFT at angle. Other text scattered along diagonal.
COMPOSITION: Asymmetric, dynamic tension.

**Prompt C (Extreme Minimal):**
LAYOUT: Small image in BOTTOM-RIGHT (20%). Main headline "${copies.h1}" alone in CENTER with 70% whitespace. Small text at bottom.
COMPOSITION: Ultra-clean, Apple-style.

**Prompt D (Full Bleed Hero):**
LAYOUT: Image fills ENTIRE background. All text on semi-transparent dark band. Huge main headline "${copies.h1}".
COMPOSITION: Dramatic, billboard-style.

**Prompt E (Left-to-Right Story):**
LAYOUT: 3 VERTICAL columns. LEFT: context image. CENTER: subheading "${copies.h2}". RIGHT: product with CTA "${copies.h4}".
COMPOSITION: Sequential reading flow.

**Prompt F (Geometric Tech):**
LAYOUT: GEOMETRIC shapes background. Image in geometric frame. Text in containers with neon accent lines.
COMPOSITION: Tech aesthetic with gradients.

**Prompt G (Organic Flow):**
LAYOUT: Image with wavy border, OFF-CENTER left. Text flows in curved path. Leaf decorations.
COMPOSITION: Watercolor-style softness.

**Prompt H (Framed Luxury):**
LAYOUT: Ornate gold FRAME border. Small centered image. Elegant text on dark background.
COMPOSITION: Premium, editorial style.

**Prompt I (Scattered Playful):**
LAYOUT: Multiple image copies at random sizes. Text at various ANGLES. Sticker/badge style.
COMPOSITION: Collage, scrapbook feeling.

**Prompt J (Vertical Japanese):**
LAYOUT: VERTICAL text orientation for main headline. Circular image frame. Intentional empty space.
COMPOSITION: Zen balance, wabi-sabi.

**Prompt K (Magazine Grid):**
LAYOUT: Strict 2x2 GRID. Image in 2 cells. Each text in bordered cell.
COMPOSITION: Editorial, catalog-style.

**Prompt L (Soft Dreamy):**
LAYOUT: BLURRED image background. Centered text with soft glow. Vignette edges.
COMPOSITION: Romantic, lifestyle mood.

🎯 Each prompt MUST:
1. ✅ Specify 1080x1080px square format
2. ✅ Include the ACTUAL text content: "${copies.h1}", "${copies.h2}", "${copies.h3}", "${copies.h4}" - NOT labels
3. ✅ Use colors: background ${colors.base}, headline ${colors.h1}, subheading ${colors.h2}, feature ${colors.h3}, CTA ${colors.h4}
4. ✅ Reference the provided images/logo
5. ✅ Follow the EXACT LAYOUT for each variant

⚠️ NEVER include "H1", "H2", "H3", "H4", "main headline:", or any labels in the generated prompts - only the actual text content in quotes.

Output format:
[PROMPT A]
(your detailed prompt for variant A - 王道・高CV構図)

[PROMPT B]
(your detailed prompt for variant B - クリエイティブ・差別化)

[PROMPT C]
(your detailed prompt for variant C - シンプル・ミニマル)

[PROMPT D]
(your detailed prompt for variant D - インパクト重視)

[PROMPT E]
(your detailed prompt for variant E - ストーリー型)

[PROMPT F]
(your detailed prompt for variant F - テクノロジー・モダン)

[PROMPT G]
(your detailed prompt for variant G - ナチュラル・オーガニック)

[PROMPT H]
(your detailed prompt for variant H - ラグジュアリー・高級感)

[PROMPT I]
(your detailed prompt for variant I - ポップ・カジュアル)

[PROMPT J]
(your detailed prompt for variant J - 和風・ジャパニーズ)

[PROMPT K]
(your detailed prompt for variant K - グリッド・構造的)

[PROMPT L]
(your detailed prompt for variant L - 感情訴求・エモーショナル)`;
  }

  private parsePromptVariants(text: string): PromptVariant {
    const extractPrompt = (key: string, nextKey: string | null) => {
      const regex = nextKey 
        ? new RegExp(`\\[PROMPT ${key}\\]([\\s\\S]*?)(?=\\[PROMPT ${nextKey}\\]|$)`)
        : new RegExp(`\\[PROMPT ${key}\\]([\\s\\S]*?)$`);
      return text.match(regex)?.[1]?.trim() || '';
    };

    return {
      A: extractPrompt('A', 'B') || this.getDefaultPrompt('A'),
      B: extractPrompt('B', 'C') || this.getDefaultPrompt('B'),
      C: extractPrompt('C', 'D') || this.getDefaultPrompt('C'),
      D: extractPrompt('D', 'E') || this.getDefaultPrompt('D'),
      E: extractPrompt('E', 'F') || this.getDefaultPrompt('E'),
      F: extractPrompt('F', 'G') || this.getDefaultPrompt('F'),
      G: extractPrompt('G', 'H') || this.getDefaultPrompt('G'),
      H: extractPrompt('H', 'I') || this.getDefaultPrompt('H'),
      I: extractPrompt('I', 'J') || this.getDefaultPrompt('I'),
      J: extractPrompt('J', 'K') || this.getDefaultPrompt('J'),
      K: extractPrompt('K', 'L') || this.getDefaultPrompt('K'),
      L: extractPrompt('L', null) || this.getDefaultPrompt('L'),
    };
  }

  private getFallbackPrompts(copies: SelectedCopies, colors: SelectedColors): PromptVariant {
    // Use actual text content directly, NOT labels like "H1:", "H2:"
    const baseText = `Display these texts: Main headline "${copies.h1}", Subheading "${copies.h2}", Feature "${copies.h3}", CTA button "${copies.h4}". Colors: background ${colors.base}, headline ${colors.h1}, subheading ${colors.h2}, feature ${colors.h3}, CTA ${colors.h4}`;

    return {
      A: `Create a 1080x1080px banner with CENTERED CLASSIC layout. Product image centered at 60% size. Large headline "${copies.h1}" at TOP, subheading "${copies.h2}" below it, feature text and CTA button at BOTTOM strip. Symmetrical, professional, clean. ${baseText}`,
      B: `Create a 1080x1080px banner with DIAGONAL DYNAMIC layout. All elements at 45-degree angle. Main headline "${copies.h1}" in top-left corner tilted. Asymmetric, artistic. ${baseText}`,
      C: `Create a 1080x1080px banner with EXTREME MINIMAL layout. Small image bottom-right (20%). Main headline "${copies.h1}" alone in center with 70% whitespace. Ultra-clean, Apple-style. ${baseText}`,
      D: `Create a 1080x1080px banner with FULL-BLEED HERO layout. Image fills entire background. All text on dark semi-transparent band. Huge headline "${copies.h1}". Billboard impact. ${baseText}`,
      E: `Create a 1080x1080px banner with 3-COLUMN STORY layout. Three vertical columns: left=context, center=subheading "${copies.h2}", right=product with CTA. Left-to-right narrative flow. ${baseText}`,
      F: `Create a 1080x1080px banner with GEOMETRIC TECH layout. Background divided into triangles/hexagons. Image in geometric frame. Neon accent lines, gradient, futuristic. ${baseText}`,
      G: `Create a 1080x1080px banner with ORGANIC FLOW layout. Image with wavy hand-drawn border, off-center left. Text curves around image. Leaf decorations, soft watercolor style. ${baseText}`,
      H: `Create a 1080x1080px banner with FRAMED LUXURY layout. Ornate gold frame border. Small centered image. Elegant text. Dark background with gold accents. ${baseText}`,
      I: `Create a 1080x1080px banner with SCATTERED PLAYFUL layout. Multiple image copies at different sizes scattered randomly. Text at various tilted angles. Sticker style, collage feeling. ${baseText}`,
      J: `Create a 1080x1080px banner with VERTICAL JAPANESE layout. Main headline "${copies.h1}" as vertical text (top-to-bottom). Image in circular frame. Intentional empty space (ma). ${baseText}`,
      K: `Create a 1080x1080px banner with RIGID GRID layout. Strict 2x2 grid division. Image in 2 cells. Each text in bordered cell. Magazine editorial style. ${baseText}`,
      L: `Create a 1080x1080px banner with DREAMY SOFT layout. Image blurred as background. Text centered with soft glow. Vignette edges. Romantic, aspirational mood. ${baseText}`,
    };
  }

  private getDefaultPrompt(variant: string): string {
    // Default prompts without specific text content - these will need text added when used
    const defaults: Record<string, string> = {
      A: 'Create a 1080x1080px banner with CENTERED layout: image centered at 60%, large headline at top, subheading below, feature and CTA at bottom strip. Symmetrical and professional.',
      B: 'Create a 1080x1080px banner with DIAGONAL layout: all elements at 45-degree angle, main headline tilted in top-left, asymmetric and artistic.',
      C: 'Create a 1080x1080px banner with MINIMAL layout: tiny image in bottom-right corner, main headline alone in center, 70% whitespace.',
      D: 'Create a 1080x1080px banner with FULL-BLEED layout: image fills entire background, text overlaid on dark band, large main headline.',
      E: 'Create a 1080x1080px banner with 3-COLUMN STORY layout: left column context, center transition, right result. Narrative flow.',
      F: 'Create a 1080x1080px banner with GEOMETRIC layout: triangular/hexagonal divisions, neon lines, gradient tech aesthetic.',
      G: 'Create a 1080x1080px banner with ORGANIC layout: wavy borders, curved text flow, leaf decorations, watercolor softness.',
      H: 'Create a 1080x1080px banner with FRAMED LUXURY layout: ornate gold frame, small centered image, dark background, elegant typography.',
      I: 'Create a 1080x1080px banner with SCATTERED layout: multiple image copies at random sizes/angles, sticker collage style.',
      J: 'Create a 1080x1080px banner with VERTICAL JAPANESE layout: vertical main headline text, circular image frame, intentional empty space.',
      K: 'Create a 1080x1080px banner with GRID layout: strict 2x2 division, image in 2 cells, each text in bordered cell, editorial style.',
      L: 'Create a 1080x1080px banner with DREAMY layout: blurred image background, centered text with soft glow, vignette edges.',
    };
    return defaults[variant] || defaults['A'];
  }
}

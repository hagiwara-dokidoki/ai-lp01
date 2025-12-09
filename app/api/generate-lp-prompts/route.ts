import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  LPScenario, 
  LPPagePrompt, 
  LPGenerationResult,
  StructuredContext,
  SelectedCopies,
  SelectedColors,
  ScrapedImage
} from '@/lib/types';

/**
 * LP Page Prompt Generation API
 * 各ページのシナリオからAIで画像生成プロンプトを作成
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { 
      scenario, 
      context, 
      selectedCopies, 
      selectedColors,
      selectedImages 
    } = await request.json() as {
      scenario: LPScenario;
      context?: StructuredContext;
      selectedCopies?: SelectedCopies;
      selectedColors?: SelectedColors;
      selectedImages?: ScrapedImage[];
    };

    if (!scenario || !scenario.pages || scenario.pages.length === 0) {
      return NextResponse.json(
        { error: 'シナリオが入力されていません' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log(`🚀 Generating LP prompts for ${scenario.pages.length} pages...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // ブランド情報をまとめる
    const brandInfo = context ? `
ブランド情報:
- サマリー: ${context.summary}
- ターゲット: ${context.target}
- 強み: ${context.benefits?.join(', ')}
- キーワード: ${context.keywords_top?.join(', ')}
` : '';

    const colorInfo = selectedColors ? `
カラーパレット:
- ベース色: ${selectedColors.base}
- メイン見出し色: ${selectedColors.h1}
- サブ見出し色: ${selectedColors.h2}
- 本文色: ${selectedColors.h3}
- アクセント色: ${selectedColors.h4}
` : '';

    const imageInfo = selectedImages && selectedImages.length > 0 ? `
参照画像 (${selectedImages.length}枚):
${selectedImages.map((img, i) => `${i + 1}. ${img.alt || 'Image'} (${img.width}x${img.height})`).join('\n')}
※これらの画像の雰囲気やスタイルを参考にしてください
` : '';

    // 全ページのプロンプトを一括生成
    const systemPrompt = `あなたはLPデザインの専門家です。
以下のLP全体の設定とページごとのシナリオから、各ページの画像生成プロンプトを作成してください。

【LP全体設定】
- ターゲット層: ${scenario.targetAudience || '一般'}
- LP目標: ${scenario.lpGoal || 'コンバージョン獲得'}
- トーン: ${scenario.tone || 'プロフェッショナル'}

${brandInfo}
${colorInfo}
${imageInfo}

【出力形式】
各ページについて、以下のJSON形式で出力してください:
{
  "pages": [
    {
      "pageNumber": 1,
      "title": "ページタイトル",
      "prompt": "画像生成AI用の詳細なプロンプト（英語）",
      "layoutDescription": "レイアウトの説明（日本語）",
      "copyText": {
        "headline": "メイン見出し",
        "subheadline": "サブ見出し",
        "body": "本文（短め）",
        "cta": "CTAテキスト（該当する場合）"
      }
    }
  ]
}

【プロンプト作成ルール】
1. 画像生成プロンプトは英語で、具体的で詳細に記述
2. LP用の縦長画像（9:16または4:5のアスペクト比）を想定
3. テキスト領域の配置を考慮したデザイン
4. ブランドカラーを活用
5. 各ページのシナリオの意図を視覚的に表現
6. 高品質、プロフェッショナルな仕上がり
7. 日本のWeb広告/LPのトレンドを意識

【ページシナリオ】
${scenario.pages.map((p: any) => `
--- ${p.pageNumber}ページ目 ---
タイトル: ${p.title}
シナリオ: ${p.scenario}
レイアウト: ${p.layoutType || '自動'}
強調: ${p.emphasis || 'なし'}
使用画像: ${p.selectedImages && p.selectedImages.length > 0 
  ? p.selectedImages.map((img: any, i: number) => `${i + 1}. ${img.alt || 'Image'}`).join(', ')
  : 'なし（AIで生成）'}
`).join('\n')}
`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    // JSONを抽出
    let parsedResult: { pages: LPPagePrompt[] };
    try {
      // JSON部分を抽出
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON not found in response');
      }
      parsedResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // フォールバック: 基本的なプロンプトを生成
      parsedResult = {
        pages: scenario.pages.map(page => ({
          pageNumber: page.pageNumber,
          title: page.title,
          prompt: generateFallbackPrompt(page, scenario, selectedColors),
          layoutDescription: `${page.title}のセクション`,
          copyText: {
            headline: page.title,
            subheadline: page.scenario.substring(0, 50),
          }
        }))
      };
    }

    const totalTime = Date.now() - startTime;

    console.log(`✅ Generated ${parsedResult.pages.length} page prompts in ${totalTime}ms`);

    const generationResult: LPGenerationResult = {
      pages: parsedResult.pages,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalPages: parsedResult.pages.length,
      }
    };

    return NextResponse.json({
      success: true,
      data: generationResult,
      timing: {
        total: totalTime,
      }
    });

  } catch (error: any) {
    console.error('LP prompt generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate LP prompts' },
      { status: 500 }
    );
  }
}

// フォールバック用のプロンプト生成
function generateFallbackPrompt(
  page: { pageNumber: number; title: string; scenario: string; layoutType?: string },
  scenario: LPScenario,
  colors?: SelectedColors
): string {
  const colorString = colors 
    ? `using colors: ${colors.base}, ${colors.h1}, ${colors.h4}` 
    : '';
  
  const layoutMap: Record<string, string> = {
    'hero': 'full-screen hero section with large background image',
    'split': 'split layout with image on left and text on right',
    'cards': 'card-based layout with multiple items',
    'timeline': 'vertical timeline layout',
    'grid': 'grid layout with multiple elements',
    'text-center': 'centered text layout with subtle background',
  };

  const layout = page.layoutType 
    ? layoutMap[page.layoutType] || 'modern web layout'
    : 'modern web layout';

  return `Professional landing page section design, ${layout}, ${page.title} section, ${page.scenario}, ${scenario.tone || 'professional'} style, ${colorString}, high quality, modern Japanese web design, clean and sophisticated, suitable for ${scenario.lpGoal || 'conversion'}, vertical aspect ratio 9:16`;
}

// タイムアウト設定
export const maxDuration = 60;

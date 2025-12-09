import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, SiteAnalysisInput, SiteAnalysisResultWithTiming } from '@/lib/services/gemini';

/**
 * Step 2: AI Analysis - generates copy candidates and color recommendations
 * Now uses 3-step analysis with timing breakdown:
 * - Step 1: Site Analysis (summary, benefits, target, keywords, entities, brand_tone)
 * - Step 2: Copy Generation (H1/H2/H3/H4 x 10 candidates = 40 copies)
 * - Step 3: Color Proposal (17 colors + 5 recommended)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { analysisInput } = await request.json();

    if (!analysisInput) {
      return NextResponse.json(
        { error: 'Analysis input is required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Initialize Gemini service
    const geminiService = new GeminiService(apiKey);

    // Analyze with Gemini using 3-step process
    console.log('🤖 Starting 3-step Gemini analysis...');
    console.log('📊 Input data:', {
      url: analysisInput.url,
      titleLength: analysisInput.title?.length || 0,
      descriptionLength: analysisInput.description?.length || 0,
      mainContentLength: analysisInput.mainContent?.length || 0,
      headlinesCount: Object.values(analysisInput.headlines || {}).flat().length,
      extractedColorsCount: analysisInput.extractedColors?.length || 0,
    });

    const analysisResult = await geminiService.analyzeSiteData(analysisInput as SiteAnalysisInput) as SiteAnalysisResultWithTiming;
    
    const totalTime = Date.now() - startTime;
    
    // Log detailed timing breakdown
    console.log('🏁 Analysis complete with timing breakdown:', {
      step1_siteAnalysis: `${analysisResult.timing.siteAnalysis}ms`,
      step2_copyGeneration: `${analysisResult.timing.copyGeneration}ms`,
      step3_colorProposal: `${analysisResult.timing.colorProposal}ms`,
      geminiTotal: `${analysisResult.timing.total}ms`,
      apiTotal: `${totalTime}ms`,
    });

    return NextResponse.json({
      success: true,
      data: {
        context: analysisResult.context,
        colorPalette: analysisResult.colorPalette,
        copyCandidates: analysisResult.copyCandidates,
        recommendedColors: analysisResult.recommendedColors,
      },
      timing: {
        siteAnalysis: analysisResult.timing.siteAnalysis,
        copyGeneration: analysisResult.timing.copyGeneration,
        colorProposal: analysisResult.timing.colorProposal,
        total: totalTime,
      }
    });
  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze site' },
      { status: 500 }
    );
  }
}

// Increase timeout for AI analysis (Vercel default is 10s for hobby, 60s for pro)
export const maxDuration = 60;
